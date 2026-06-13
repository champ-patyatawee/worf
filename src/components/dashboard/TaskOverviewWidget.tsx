import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface TaskStats { total: number; todo: number; inProgress: number; done: number; }

export function TaskOverviewWidget() {
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const boards: any[] = await invoke('list_boards');
        let allTasks: any[] = [];
        for (const b of boards) {
          const board = await invoke<any>('get_board', { idOrSlug: b.id });
          allTasks = allTasks.concat(board.tasks || []);
        }
        if (!cancelled) setStats({
          total: allTasks.length,
          todo: allTasks.filter((t: any) => t.status === 'todo').length,
          inProgress: allTasks.filter((t: any) => t.status === 'in_progress').length,
          done: allTasks.filter((t: any) => t.status === 'done').length,
        });
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed');
      } finally { if (!cancelled) setLoading(false); }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  const pct = stats && stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  if (error) return (
    <div className="min-h-full p-4" style={{ backgroundColor: '#A7F3D0' }}>
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Tasks</span>
      <p className="text-sm text-[var(--color-error)] mt-2">{error}</p>
    </div>
  );

  return (
    <div className="min-h-full p-4 flex flex-col" style={{ backgroundColor: '#A7F3D0' }}>
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Tasks</span>
      {loading ? (
        <div className="flex items-center justify-center flex-1"><div className="animate-spin rounded-full h-5 w-5 border-2" style={{ borderColor: 'var(--color-text-tertiary)', borderTopColor: 'transparent' }} /></div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-4 gap-2 my-3">
            <div className="text-center"><div className="font-mono text-xl font-bold text-[var(--color-text-primary)]">{stats.total}</div><div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Total</div></div>
            <div className="text-center"><div className="font-mono text-xl font-bold text-[var(--color-warning)]">{stats.todo}</div><div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Todo</div></div>
            <div className="text-center"><div className="font-mono text-xl font-bold text-[var(--color-accent-primary)]">{stats.inProgress}</div><div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Doing</div></div>
            <div className="text-center"><div className="font-mono text-xl font-bold text-[var(--color-success)]">{stats.done}</div><div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Done</div></div>
          </div>
          <div className="mt-auto mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Progress</span>
              <span className="font-mono font-bold text-sm text-[var(--color-accent-primary)]">{pct}%</span>
            </div>
            <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-[#0D0D0D]">
              <div className="h-full transition-all duration-500 rounded-full" style={{
                width: `${pct}%`,
                backgroundColor: pct >= 70 ? 'var(--color-success)' : pct >= 40 ? 'var(--color-warning)' : 'var(--color-error)',
              }} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
