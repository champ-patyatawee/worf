import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Task } from '@/types/kanban';
import { KanbanTaskCard } from './KanbanTaskCard';

interface KanbanColumnProps {
  status: Task['status'];
  label: string;
  tasks: Task[];
  onMoveTask: (taskId: string, newStatus: Task['status']) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: () => void;
}

const statusColors: Record<Task['status'], string> = {
  todo: '#9CA3AF',
  in_progress: '#7C5CFF',
  done: '#4ADE80',
};

export function KanbanColumn({ status, label, tasks, onMoveTask, onEditTask, onDeleteTask, onAddTask }: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onMoveTask(taskId, status);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="w-[300px] flex flex-col flex-shrink-0 rounded-[var(--radius-lg)] border-2 overflow-hidden transition-colors"
      style={{
        backgroundColor: isDragOver ? 'var(--color-accent-subtle)' : 'var(--color-bg-secondary)',
        borderColor: isDragOver ? 'var(--color-accent-primary)' : 'var(--color-border-primary)',
        boxShadow: isDragOver ? '3px 3px 0px var(--color-accent-primary)' : '3px 3px 0px #0D0D0D',
      }}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b-2" style={{ borderColor: 'var(--color-border-primary)' }}>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full border-2"
            style={{ backgroundColor: statusColors[status], borderColor: 'var(--color-border-primary)' }}
          />
          <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{label}</span>
          <span
            className="text-xs font-bold px-1.5 py-0.5 rounded-full border-2"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border-primary)', color: 'var(--color-text-secondary)' }}
          >
            {tasks.length}
          </span>
        </div>
        <button
          onClick={onAddTask}
          className="p-1 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-hover)] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" style={{ color: 'var(--color-text-secondary)' }} />
        </button>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px]">
        {tasks.map((task) => (
          <KanbanTaskCard
            key={task.id}
            task={task}
            onMove={onMoveTask}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-6 text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
            No tasks
          </div>
        )}
      </div>
    </div>
  );
}
