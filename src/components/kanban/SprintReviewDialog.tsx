import type { Sprint, Task, SprintCompleteSummary } from '../../types';

import { Columns3, CheckCircle } from 'lucide-react';

interface SprintReviewDialogProps {
  isOpen: boolean;
  sprint: Sprint | null;
  completedTasks: Task[];
  backlogTasks: Task[];
  summary: SprintCompleteSummary | null;
  onClose: () => void;
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${s.toLocaleDateString('en-US', opts)} - ${e.toLocaleDateString('en-US', opts)}`;
}

export function SprintReviewDialog({
  isOpen,
  sprint,
  completedTasks,
  backlogTasks,
  summary,
  onClose,
}: SprintReviewDialogProps) {
  if (!isOpen || !sprint) return null;

  const total = summary?.total_tasks ?? 0;
  const completed = summary?.completed_tasks ?? completedTasks.length;
  const moved = summary?.moved_to_backlog ?? backlogTasks.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
      <div className="w-full max-w-lg rounded-[var(--radius-lg)] border-2 border-[#0D0D0D] p-6"
        style={{ backgroundColor: 'var(--color-bg-secondary)', boxShadow: '6px 6px 0px #0D0D0D' }}>
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full border-2 border-[#0D0D0D] flex items-center justify-center"
            style={{ backgroundColor: '#16A34A' }}>
            <CheckCircle className="h-6 w-6" style={{ color: '#22C55E' }} />
          </div>
          <div>
            <h2 className="text-lg font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
              {sprint.name} Complete!
            </h2>
            <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {formatDateRange(sprint.start_date, sprint.end_date)}
            </p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="flex items-center gap-4 mb-4 p-3 border-2 border-[#0D0D0D] rounded-[8px]"
          style={{ backgroundColor: 'var(--color-bg-primary)' }}>
          <div className="flex-1 text-center">
            <div className="text-2xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>{total}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Total</div>
          </div>
          <div className="w-px h-8" style={{ backgroundColor: 'var(--color-border-primary)' }} />
          <div className="flex-1 text-center">
            <div className="text-2xl font-extrabold" style={{ color: '#16A34A' }}>{completed}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Done</div>
          </div>
          <div className="w-px h-8" style={{ backgroundColor: 'var(--color-border-primary)' }} />
          <div className="flex-1 text-center">
            <div className="text-2xl font-extrabold" style={{ color: '#CA8A04' }}>{moved}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Moved</div>
          </div>
        </div>

        {/* Completed tasks */}
        {completedTasks.length > 0 && (
          <div className="mb-3">
            <h3 className="text-xs font-extrabold mb-2 flex items-center gap-1.5" style={{ color: '#16A34A' }}>
              <CheckCircle className="h-4 w-4" /> Completed ({completedTasks.length})
            </h3>
            <div className="space-y-1">
              {completedTasks.map((t) => (
                <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 border-2 border-[#0D0D0D] rounded-[6px]"
                  style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border"
                    style={{ borderColor: 'var(--color-border-primary)', color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                    {t.priority === 'high' ? <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#EF4444' }} /> : t.priority === 'medium' ? <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#CA8A04' }} /> : <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#22C55E' }} />}
                  </span>
                  <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Moved to backlog */}
        {backlogTasks.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-extrabold mb-2 flex items-center gap-1.5" style={{ color: '#CA8A04' }}>
              <Columns3 className="h-4 w-4" /> Moved to Backlog ({backlogTasks.length})
            </h3>
            <div className="space-y-1">
              {backlogTasks.map((t) => (
                <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 border-2 border-[#0D0D0D] rounded-[6px]"
                  style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border"
                    style={{ borderColor: 'var(--color-border-primary)', color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                    {t.priority === 'high' ? <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#EF4444' }} /> : t.priority === 'medium' ? <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#CA8A04' }} /> : <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#22C55E' }} />}
                  </span>
                  <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close button */}
        <div className="flex justify-end pt-2">
          <button onClick={onClose}
            className="px-5 py-2 text-sm font-bold rounded-[var(--radius-md)] border-2 border-[#0D0D0D] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none"
            style={{ backgroundColor: 'var(--color-accent-primary)', color: 'white' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}