import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useNavigate } from 'react-router-dom';
import { FolderKanban } from 'lucide-react';

interface BoardSummary { id: string; name: string; slug: string; taskCount: number; }

export function ProjectsWidget() {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const data: any[] = await invoke('list_boards');
        const summaries: BoardSummary[] = await Promise.all(
          data.map(async (b) => {
            try {
              const full = await invoke<any>('get_board', { idOrSlug: b.id });
              return { id: b.id, name: b.name, slug: b.slug, taskCount: (full.tasks || []).length };
            } catch { return { id: b.id, name: b.name, slug: b.slug, taskCount: 0 }; }
          })
        );
        if (!cancelled) setBoards(summaries);
      } catch { /* silent */ }
      finally { if (!cancelled) setLoading(false); }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-full p-4 flex flex-col" style={{ backgroundColor: '#FEF08A' }}>
      <div className="flex items-center gap-2 mb-2">
        <FolderKanban className="h-4 w-4 text-[var(--color-accent-primary)]" />
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Projects</span>
      </div>
      {loading ? (
        <div className="flex items-center justify-center flex-1"><div className="animate-spin rounded-full h-5 w-5 border-2" style={{ borderColor: 'var(--color-text-tertiary)', borderTopColor: 'transparent' }} /></div>
      ) : boards.length === 0 ? (
        <div className="flex items-center justify-center flex-1"><p className="text-sm text-[var(--color-text-tertiary)]">No projects yet</p></div>
      ) : (
        <>
          <div className="flex items-baseline gap-1 mb-3">
            <span className="font-mono text-2xl font-bold text-[var(--color-text-primary)]">{boards.length}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">{boards.length === 1 ? 'project' : 'projects'}</span>
          </div>
          <div className="space-y-1.5 flex-1 overflow-y-auto">
            {boards.slice(0, 5).map(b => (
              <button key={b.id} onClick={() => navigate(`/kanban/${b.slug}`)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-[8px] border-2 border-[#0D0D0D] bg-white/70 hover:bg-white transition-all text-left shadow-[2px_2px_0px_#0D0D0D] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#0D0D0D]">
                <span className="text-[13px] font-bold text-[var(--color-text-primary)] truncate">{b.name}</span>
                <span className="text-[11px] font-mono font-bold text-[var(--color-text-secondary)]">{b.taskCount}</span>
              </button>
            ))}
          </div>
          {boards.length > 5 && (
            <button onClick={() => navigate('/kanban')} className="w-full text-center text-[11px] font-bold text-[var(--color-accent-primary)] mt-2 hover:underline py-1">
              View all {boards.length} projects
            </button>
          )}
        </>
      )}
    </div>
  );
}
