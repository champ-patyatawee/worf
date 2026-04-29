import type { Task } from '@/types/kanban';
import { Pencil, Trash2, ArrowRight, ArrowLeft, GripVertical } from 'lucide-react';

const priorityConfig: Record<Task['priority'], { label: string; bg: string; text: string }> = {
  low: { label: 'Low', bg: 'rgba(156, 163, 175, 0.15)', text: '#6B7280' },
  medium: { label: 'Med', bg: 'rgba(250, 204, 21, 0.15)', text: '#CA8A04' },
  high: { label: 'High', bg: 'rgba(251, 113, 133, 0.15)', text: '#E11D48' },
};

interface KanbanTaskCardProps {
  task: Task;
  onMove: (taskId: string, newStatus: Task['status']) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export function KanbanTaskCard({ task, onMove, onEdit, onDelete }: KanbanTaskCardProps) {
  const priority = priorityConfig[task.priority] || priorityConfig.medium;

  const getNextStatus = (): Task['status'] | null => {
    if (task.status === 'todo') return 'in_progress';
    if (task.status === 'in_progress') return 'done';
    return null;
  };

  const getPrevStatus = (): Task['status'] | null => {
    if (task.status === 'done') return 'in_progress';
    if (task.status === 'in_progress') return 'todo';
    return null;
  };

  const nextStatus = getNextStatus();
  const prevStatus = getPrevStatus();

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    (e.currentTarget as HTMLElement).style.opacity = '0.4';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className="group rounded-[var(--radius-md)] border-2 p-3 transition-all hover:shadow-[2px_2px_0px_#0D0D0D] cursor-grab active:cursor-grabbing"
      style={{
        backgroundColor: 'var(--color-bg-primary)',
        borderColor: 'var(--color-border-primary)',
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-start gap-1.5">
          <GripVertical className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
          <h4 className="text-sm font-bold leading-tight" style={{ color: 'var(--color-text-primary)' }}>{task.title}</h4>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(task)}
            className="p-1 rounded hover:bg-[var(--color-bg-hover)]"
            title="Edit"
          >
            <Pencil className="h-3 w-3" style={{ color: 'var(--color-text-tertiary)' }} />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 rounded hover:bg-[var(--color-bg-hover)]"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" style={{ color: 'var(--color-error)' }} />
          </button>
        </div>
      </div>

      {task.description && (
        <p className="text-xs font-medium mb-2 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 uppercase tracking-wide"
          style={{ backgroundColor: priority.bg, color: priority.text, borderColor: 'var(--color-border-primary)' }}
        >
          {priority.label}
        </span>

        {/* Move Buttons */}
        <div className="flex items-center gap-1">
          {prevStatus && (
            <button
              onClick={() => onMove(task.id, prevStatus)}
              className="p-1 rounded hover:bg-[var(--color-bg-hover)] transition-colors"
              title="Move left"
            >
              <ArrowLeft className="h-3 w-3" style={{ color: 'var(--color-text-tertiary)' }} />
            </button>
          )}
          {nextStatus && (
            <button
              onClick={() => onMove(task.id, nextStatus)}
              className="p-1 rounded hover:bg-[var(--color-bg-hover)] transition-colors"
              title="Move right"
            >
              <ArrowRight className="h-3 w-3" style={{ color: 'var(--color-text-tertiary)' }} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
