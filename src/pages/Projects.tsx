import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import type { Board } from '../types';
import { Columns3, Timer, Plus, FolderKanban, Search } from 'lucide-react';

interface BoardSummary {
  id: string;
  name: string;
  slug: string;
  board_type: string;
  taskCount: number;
}

export function Projects() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const data: Board[] = await invoke('list_boards');
        const summaries: BoardSummary[] = await Promise.all(
          data.map(async (b) => {
            try {
              const full = await invoke<any>('get_board', { idOrSlug: b.id });
              return { id: b.id, name: b.name, slug: b.slug, board_type: b.board_type, taskCount: (full.tasks || []).length };
            } catch {
              return { id: b.id, name: b.name, slug: b.slug, board_type: b.board_type, taskCount: 0 };
            }
          })
        );
        if (!cancelled) setBoards(summaries);
      } catch { /* silent */ }
      finally { if (!cancelled) setLoading(false); }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  const filteredBoards = boards.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const kanbanBoards = filteredBoards.filter(b => b.board_type === 'kanban');
  const sprintBoards = filteredBoards.filter(b => b.board_type === 'sprint');

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>Projects</h1>
            <p className="text-sm font-medium mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {boards.length} {boards.length === 1 ? 'project' : 'projects'} total
            </p>
          </div>
          <button
            onClick={() => navigate('/project')}
            className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] border-2 text-sm font-bold transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none"
            style={{ backgroundColor: 'var(--color-accent-primary)', borderColor: 'var(--color-border-primary)', color: 'white' }}>
            <Plus className="h-4 w-4" /> New Project
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--color-text-tertiary)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border-2 rounded-[var(--radius-md)] outline-none"
            style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-primary)', color: 'var(--color-text-primary)' }}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-7 w-7 border-2" style={{ borderColor: 'var(--color-text-tertiary)', borderTopColor: 'transparent' }} />
          </div>
        ) : boards.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-[var(--radius-lg)] border-2 flex items-center justify-center"
              style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-bg-secondary)' }}>
              <FolderKanban className="h-10 w-10" style={{ color: 'var(--color-text-tertiary)' }} />
            </div>
            <h2 className="text-xl font-extrabold mb-2" style={{ color: 'var(--color-text-primary)' }}>No projects yet</h2>
            <p className="text-sm font-medium mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              Create your first project to get started.
            </p>
            <button
              onClick={() => navigate('/project')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-md)] border-2 text-sm font-bold transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none"
              style={{ backgroundColor: 'var(--color-accent-primary)', borderColor: 'var(--color-border-primary)', color: 'white' }}>
              <Plus className="h-4 w-4" /> Create Project
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Kanban Boards */}
            {kanbanBoards.length > 0 && (
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-wider mb-3 flex items-center gap-2"
                  style={{ color: 'var(--color-text-tertiary)' }}>
                  <Columns3 className="h-4 w-4" />
                  Kanban Boards ({kanbanBoards.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {kanbanBoards.map((board) => (
                    <ProjectCard key={board.id} board={board} onClick={() => navigate(`/project/${board.slug}`)} />
                  ))}
                </div>
              </div>
            )}

            {/* Sprint Projects */}
            {sprintBoards.length > 0 && (
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-wider mb-3 flex items-center gap-2"
                  style={{ color: 'var(--color-text-tertiary)' }}>
                  <Timer className="h-4 w-4" />
                  Sprint Projects ({sprintBoards.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sprintBoards.map((board) => (
                    <ProjectCard key={board.id} board={board} onClick={() => navigate(`/project/${board.slug}`)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ board, onClick }: { board: BoardSummary; onClick: () => void }) {
  const isSprint = board.board_type === 'sprint';
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 px-5 py-4 rounded-[var(--radius-lg)] border-2 text-left transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0px_#0D0D0D] group"
      style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-primary)', boxShadow: '3px 3px 0px #0D0D0D' }}
    >
      <div className="w-10 h-10 rounded-[var(--radius-md)] border-2 flex items-center justify-center flex-shrink-0"
        style={{ borderColor: 'var(--color-border-primary)', backgroundColor: isSprint ? 'rgba(124, 92, 255, 0.1)' : 'rgba(74, 222, 128, 0.1)' }}>
        {isSprint ? (
          <Timer className="h-5 w-5" style={{ color: '#7C5CFF' }} />
        ) : (
          <Columns3 className="h-5 w-5" style={{ color: '#4ADE80' }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold truncate" style={{ color: 'var(--color-text-primary)' }}>
            {board.name}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0"
            style={{
              borderColor: 'var(--color-border-primary)',
              color: 'var(--color-text-tertiary)',
              backgroundColor: 'var(--color-bg-tertiary)',
            }}>
            {isSprint ? 'Sprint' : 'Kanban'}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {board.taskCount} {board.taskCount === 1 ? 'task' : 'tasks'}
          </span>
        </div>
      </div>
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs font-bold" style={{ color: 'var(--color-accent-primary)' }}>Open →</span>
      </div>
    </button>
  );
}