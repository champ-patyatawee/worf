import { AlertTriangle } from 'lucide-react';
import type { Sprint } from '../../types';

interface SprintCompleteDialogProps {
  isOpen: boolean;
  sprint: Sprint | null;
  onClose: () => void;
  onConfirm: () => void;
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${s.toLocaleDateString('en-US', opts)} - ${e.toLocaleDateString('en-US', opts)}`;
}

export function SprintCompleteDialog({ isOpen, sprint, onClose, onConfirm }: SprintCompleteDialogProps) {
  if (!isOpen || !sprint) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
      <div className="w-full max-w-sm rounded-[var(--radius-lg)] border-2 p-5"
        style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-primary)', boxShadow: '4px 4px 0px #0D0D0D' }}>
        <h2 className="text-lg font-extrabold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Complete Sprint
        </h2>
        <div className="mb-1">
          <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{sprint.name}</span>
          <span className="text-xs font-medium ml-2" style={{ color: 'var(--color-text-secondary)' }}>
            {formatDateRange(sprint.start_date, sprint.end_date)}
          </span>
        </div>
        <div className="flex items-start gap-2 mt-3 p-3 rounded-[var(--radius-md)] border-2"
          style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)', borderColor: 'rgba(251, 191, 36, 0.3)' }}>
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
          <p className="text-xs font-semibold" style={{ color: '#92400E' }}>
            Tasks not completed will be moved back to the backlog.
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-bold rounded-[var(--radius-md)] border-2 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none"
            style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-primary)', color: 'var(--color-text-primary)' }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            className="px-4 py-2 text-sm font-bold rounded-[var(--radius-md)] border-2 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none"
            style={{ backgroundColor: 'var(--color-accent-primary)', borderColor: 'var(--color-border-primary)', color: 'white' }}>
            Complete
          </button>
        </div>
      </div>
    </div>
  );
}