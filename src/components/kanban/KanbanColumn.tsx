import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Task } from '../../types';
import { KanbanTaskCard } from './KanbanTaskCard';

interface KanbanColumnProps {
  status: string; label: string; tasks: Task[];
  onMoveTask: (taskId: string, newStatus: string) => void;
  onEditTask: (task: Task) => void; onDeleteTask: (taskId: string) => void;
  onAddTask: () => void;
}

const statusColors: Record<string, string> = {
  todo: '#9CA3AF', in_progress: '#7C5CFF', done: '#4ADE80',
};

export function KanbanColumn({ status, label, tasks, onMoveTask, onEditTask, onDeleteTask, onAddTask }: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      data-kanban-column={status}
      onPointerEnter={() => setIsDragOver(true)}
      onPointerLeave={() => setIsDragOver(false)}
      className="w-[300px] flex flex-col flex-shrink-0 rounded-[var(--radius-lg)] border-2 overflow-hidden transition-all duration-200"
      style={{
        backgroundColor: isDragOver ? 'rgba(124, 92, 255, 0.08)' : 'var(--color-bg-secondary)',
        borderColor: isDragOver ? 'var(--color-accent-primary)' : 'var(--color-border-primary)',
        boxShadow: isDragOver ? '0 0 0 2px var(--color-accent-primary), 4px 4px 0px #0D0D0D' : '3px 3px 0px #0D0D0D',
        transform: isDragOver ? 'translateY(-2px)' : 'none',
      }}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b-2" style={{ borderColor: 'var(--color-border-primary)' }}>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2" style={{ backgroundColor: statusColors[status] || '#9CA3AF', borderColor: 'var(--color-border-primary)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{label}</span>
          <span className="text-xs font-bold px-1.5 py-0.5 rounded-full border-2"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border-primary)', color: 'var(--color-text-secondary)' }}>
            {tasks.length}
          </span>
        </div>
        <button onClick={onAddTask} className="p-1 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-hover)] transition-colors">
          <Plus className="h-3.5 w-3.5" style={{ color: 'var(--color-text-secondary)' }} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px]">
        {tasks.map((task) => (
          <KanbanTaskCard key={task.id} task={task} onMove={onMoveTask} onEdit={onEditTask} onDelete={onDeleteTask} />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-6 text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>No tasks</div>
        )}
      </div>
    </div>
  );
}
