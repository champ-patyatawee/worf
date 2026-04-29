import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { kanbanApi } from '@/services/kanbanApi';
import type { Board } from '@/types/kanban';
import { LayoutGrid, Plus, Trash2, FolderKanban } from 'lucide-react';

export function KanbanSidebar() {
  const location = useLocation();
  const [boards, setBoards] = useState<Board[]>([]);
  const [newBoardName, setNewBoardName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadBoards = async () => {
    try {
      const data = await kanbanApi.getBoards();
      setBoards(data);
    } catch (err) {
      console.error('Failed to load boards:', err);
    }
  };

  useEffect(() => {
    loadBoards();
  }, [location.pathname]);

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return;
    try {
      await kanbanApi.createBoard(newBoardName.trim());
      setNewBoardName('');
      setIsCreating(false);
      await loadBoards();
    } catch (err) {
      console.error('Failed to create board:', err);
    }
  };

  const handleDeleteBoard = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await kanbanApi.deleteBoard(id);
      await loadBoards();
    } catch (err) {
      console.error('Failed to delete board:', err);
    }
  };

  const currentBoardSlug = location.pathname.startsWith('/kanban/')
    ? location.pathname.split('/')[2]
    : null;

  return (
    <aside
      className="w-[260px] h-full flex flex-col flex-shrink-0 border-r-2"
      style={{ backgroundColor: '#FFFBEB', borderColor: 'var(--color-border-primary)' }}
    >
      {/* Header */}
      <div className="p-4 border-b-2" style={{ borderColor: 'var(--color-border-primary)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[var(--radius-md)] border-2 flex items-center justify-center" style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-accent-primary)' }}>
              <FolderKanban className="h-4 w-4 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Projects</span>
          </div>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] border-2 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none"
            style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-bg-secondary)' }}
            title="New Project"
          >
            <Plus className="h-4 w-4" style={{ color: 'var(--color-text-primary)' }} />
          </button>
        </div>

        {/* Create Board Input */}
        {isCreating && (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="Project name..."
              className="flex-1 px-2 py-1.5 text-sm border-2 rounded-[var(--radius-md)] outline-none"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border-primary)',
                color: 'var(--color-text-primary)',
              }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateBoard();
                if (e.key === 'Escape') { setIsCreating(false); setNewBoardName(''); }
              }}
            />
            <button
              onClick={handleCreateBoard}
              className="px-2 py-1 text-xs font-bold rounded-[var(--radius-md)] border-2"
              style={{ backgroundColor: 'var(--color-accent-primary)', color: 'white', borderColor: 'var(--color-border-primary)' }}
            >
              Add
            </button>
          </div>
        )}
      </div>

      {/* Board List */}
      <div className="flex-1 overflow-y-auto p-3">
        {boards.map((board) => {
          const isActive = currentBoardSlug === board.slug;
          return (
            <Link
              key={board.id}
              to={`/kanban/${board.slug}`}
              className="flex items-center group rounded-[var(--radius-md)] px-2 py-2 mb-1 transition-colors"
              style={{
                backgroundColor: isActive ? 'var(--color-accent-subtle)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--color-accent-primary)' : '3px solid transparent',
              }}
            >
              <LayoutGrid
                className="h-4 w-4 mr-2 flex-shrink-0"
                style={{
                  color: isActive ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                  opacity: isActive ? 1 : 0.5,
                }}
              />
              <span
                className="flex-1 text-sm truncate font-medium"
                style={{
                  color: isActive ? 'var(--color-accent-primary)' : 'var(--color-text-primary)',
                  opacity: isActive ? 1 : 0.7,
                }}
              >
                {board.name}
              </span>
              <button
                onClick={(e) => handleDeleteBoard(board.id, e)}
                className="hidden group-hover:block p-1 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-hover)]"
              >
                <Trash2 className="h-3 w-3" style={{ color: 'var(--color-error)' }} />
              </button>
            </Link>
          );
        })}

        {boards.length === 0 && (
          <div className="text-sm px-2 py-2 text-center font-medium" style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }}>
            No projects yet. Create one!
          </div>
        )}
      </div>
    </aside>
  );
}
