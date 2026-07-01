import type { Task } from '../../types';
import { useNavigate } from 'react-router-dom';

const priorityColors: Record<string, { bg: string; text: string }> = {
  high: { bg: 'rgba(239, 68, 68, 0.15)', text: '#DC2626' },
  medium: { bg: 'rgba(251, 191, 36, 0.15)', text: '#D97706' },
  low: { bg: 'rgba(156, 163, 175, 0.12)', text: '#6B7280' },
};

export function CalendarTaskPill({ task }: { task: Task }) {
  const navigate = useNavigate();
  const p = priorityColors[task.priority] || priorityColors.medium;

  const truncatedTitle = task.title.length > 15 ? task.title.slice(0, 14) + '…' : task.title;

  return (
    <button
      onClick={() => navigate(`/project/${task.board_id}`)}
      className="w-full text-left truncate rounded px-1 py-0.5 text-[10px] font-bold leading-tight border transition-all hover:shadow-[1px_1px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none mb-0.5 cursor-pointer"
      style={{
        backgroundColor: p.bg,
        color: p.text,
        borderColor: 'var(--color-border-primary)',
        lineHeight: '1.2',
      }}
      title={`${task.title} (${new Date(task.due_date! + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`}
    >
      {truncatedTitle}
    </button>
  );
}