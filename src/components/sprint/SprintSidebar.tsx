import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import type { Board, Objective, ObjectiveWithKRs } from '../../types';
import { Plus, Trash2, Timer, X, Target } from 'lucide-react';

export function SprintSidebar() {
  const location = useLocation();
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardObjectives, setBoardObjectives] = useState<Record<string, string>>({});
  const [showDialog, setShowDialog] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const loadBoards = async () => {
    try {
      const data = await invoke<Board[]>('list_boards');
      setBoards(data);
      // Load linked objectives for boards
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const quarter = `Q${Math.ceil(month / 3)}`;
      const objectives = await invoke<Objective[]>('list_objectives', { quarter, year });
      const map: Record<string, string> = {};
      for (const obj of objectives) {
        try {
          const full = await invoke<ObjectiveWithKRs>('get_objective', { id: obj.id });
          for (const bId of full.board_ids) {
            map[bId] = full.objective.title;
          }
        } catch { /* skip */ }
      }
      setBoardObjectives(map);
    } catch (err) {
      console.error('Failed to load boards:', err);
    }
  };

  useEffect(() => { loadBoards(); }, [location.pathname]);

  useEffect(() => {
    if (showDialog) {
      setNewBoardName('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showDialog]);

  const handleCreateBoard = async () => {
    const name = newBoardName.trim();
    if (!name) return;
    try {
      await invoke('create_board', { name, description: null, boardType: 'sprint' });
      setShowDialog(false);
      await loadBoards();
    } catch (err) {
      console.error('Failed to create board:', err);
    }
  };

  const handleDeleteBoard = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    try {
      await invoke('delete_board', { id });
      await loadBoards();
    } catch (err) {
      console.error('Failed to delete board:', err);
    }
  };

  const currentBoardSlug = location.pathname.startsWith('/projects/')
    ? location.pathname.split('/')[2] : null;

  const sprintBoards = boards.filter(b => b.board_type === 'sprint');

  return (
    <aside className="w-[260px] h-full flex flex-col flex-shrink-0 border-r-2"
      style={{ backgroundColor: '#FFFBEB', borderColor: 'var(--color-border-primary)' }}>
      <div className="p-4 border-b-2" style={{ borderColor: 'var(--color-border-primary)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[var(--radius-md)] border-2 flex items-center justify-center"
              style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-accent-primary)' }}>
              <Timer className="h-4 w-4 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Sprints</span>
          </div>
          <button onClick={() => setShowDialog(true)}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] border-2 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none"
            style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-bg-secondary)' }}>
            <Plus className="h-4 w-4" style={{ color: 'var(--color-text-primary)' }} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {sprintBoards.map((board) => {
          const isActive = currentBoardSlug === board.slug;
          return (
            <Link key={board.id} to={`/projects/${board.slug}`} onClick={() => { (window as any).__setPersistedSprintSlug?.(board.slug); }}
              className="flex items-center group rounded-[var(--radius-md)] px-2 py-2 mb-1 transition-colors"
              style={{ backgroundColor: isActive ? 'var(--color-accent-subtle)' : 'transparent', borderLeft: isActive ? '3px solid var(--color-accent-primary)' : '3px solid transparent' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5" />
                  <span className="text-sm truncate font-medium block"
                    style={{ color: isActive ? 'var(--color-accent-primary)' : 'var(--color-text-primary)', opacity: isActive ? 1 : 0.7 }}>
                    {board.name}
                  </span>
                </div>
                {boardObjectives[board.id] && (
                  <span className="text-[10px] font-medium truncate block"
                    style={{ color: 'var(--color-accent-primary)', opacity: 0.6 }}>
                    <Target className="h-3 w-3 inline" /> {boardObjectives[board.id]}
                  </span>
                )}
              </div>
              <button onClick={(e) => handleDeleteBoard(board.id, e)}
                className="hidden group-hover:block p-1 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-hover)] flex-shrink-0">
                <Trash2 className="h-3 w-3" style={{ color: 'var(--color-error)' }} />
              </button>
            </Link>
          );
        })}
        {sprintBoards.length === 0 && (
          <div className="text-sm px-2 py-2 text-center font-medium" style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }}>
            No sprint projects yet. Create one!
          </div>
        )}
      </div>

      {/* Create Board Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
          onClick={() => setShowDialog(false)}>
          <div className="w-80 rounded-[var(--radius-lg)] border-2 p-5 animate-scaleIn"
            style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-primary)', boxShadow: 'var(--shadow-modal)' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-extrabold" style={{ color: 'var(--color-text-primary)' }}>New Sprint Project</h2>
              <button onClick={() => setShowDialog(false)} className="p-1 rounded hover:bg-[var(--color-bg-hover)]">
                <X className="h-4 w-4" style={{ color: 'var(--color-text-tertiary)' }} />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateBoard(); }} className="space-y-3">
              <input ref={inputRef} type="text" value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="Sprint project name..." autoFocus
                className="w-full px-3 py-2 text-sm border-2 rounded-[var(--radius-md)] outline-none"
                style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-primary)', color: 'var(--color-text-primary)' }} />

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowDialog(false)}
                  className="px-3 py-1.5 text-xs font-bold rounded-[var(--radius-md)] border-2 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none"
                  style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-primary)', color: 'var(--color-text-primary)' }}>Cancel</button>
                <button type="submit" disabled={!newBoardName.trim()}
                  className="px-3 py-1.5 text-xs font-bold rounded-[var(--radius-md)] border-2 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-accent-primary)', borderColor: 'var(--color-border-primary)', color: 'white' }}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}