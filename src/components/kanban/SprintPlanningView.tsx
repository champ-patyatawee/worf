import type { Sprint, Task } from '../../types';
import { Plus, X } from 'lucide-react';

interface SprintPlanningViewProps {
  sprint: Sprint;
  allTasks: Task[];
  sprintTaskIds: Set<string>;
  onAddToSprint: (taskId: string) => void;
  onRemoveFromSprint: (taskId: string) => void;
  onStartSprint: () => void;
  onEditTask: (task: Task) => void;
}

const priorityConfig: Record<string, { dot: string }> = {
  low: { dot: '🟢' },
  medium: { dot: '🟡' },
  high: { dot: '🔴' },
};

function formatDateRange(start: string, end: string) {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${s.toLocaleDateString('en-US', opts)} - ${e.toLocaleDateString('en-US', opts)}`;
}

function TaskCard({ task, actionButton, onEdit }: { task: Task; actionButton: React.ReactNode; onEdit?: (task: Task) => void }) {
  const p = priorityConfig[task.priority] || priorityConfig.medium;

  return (
    <div
      onClick={() => onEdit?.(task)}
      className="flex items-center gap-3 px-3 py-2.5 border-2 border-[#0D0D0D] rounded-[8px] shadow-[2px_2px_0px_#0D0D0D] cursor-pointer transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#0D0D0D]"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <span className="text-base flex-shrink-0">{p.dot}</span>
      <span className="flex-1 text-sm font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
        {task.title}
      </span>
      {task.due_date && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0"
          style={{ borderColor: 'var(--color-border-primary)', color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-tertiary)' }}>
          {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      )}
      <div className="flex-shrink-0">{actionButton}</div>
    </div>
  );
}

export function SprintPlanningView({
  sprint,
  allTasks,
  sprintTaskIds,
  onAddToSprint,
  onRemoveFromSprint,
  onStartSprint,
  onEditTask,
}: SprintPlanningViewProps) {
  // Tasks not in any sprint AND not in this sprint (available backlog tasks)
  const backlogTasks = allTasks.filter(
    (t) => !t.sprint_id && !sprintTaskIds.has(t.id)
  );

  // Tasks already assigned to this sprint
  const sprintTasks = allTasks.filter((t) => sprintTaskIds.has(t.id));

  const hasSprintTasks = sprintTasks.length > 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 p-6">
      <div className="max-w-4xl mx-auto w-full flex flex-col min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div>
            <h2 className="text-lg font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
              Sprint Planning: {sprint.name}
            </h2>
            <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              {formatDateRange(sprint.start_date, sprint.end_date)}
              {sprint.goal && <span className="ml-2">· Goal: {sprint.goal}</span>}
            </p>
          </div>
          <button
            onClick={onStartSprint}
            disabled={!hasSprintTasks}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-[var(--radius-md)] border-2 border-[#0D0D0D] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            style={{ backgroundColor: '#16A34A', color: 'white' }}
          >
            <ZapIcon /> Start Sprint →
          </button>
        </div>

        {/* Two-panel layout */}
        <div className="flex-1 flex gap-6 min-h-0">
          {/* Left panel: Available (Backlog) */}
          <div className="flex-1 flex flex-col min-h-0 rounded-[8px] border-2 border-[#0D0D0D] shadow-[2px_2px_0px_#0D0D0D] overflow-hidden"
            style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <div className="flex items-center justify-between px-4 py-2.5 border-b-2 border-[#0D0D0D] flex-shrink-0"
              style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
              <h3 className="text-sm font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
                Available ({backlogTasks.length})
              </h3>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border"
                style={{ borderColor: 'var(--color-border-primary)', color: 'var(--color-text-tertiary)' }}>
                drag →
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {backlogTasks.length === 0 ? (
                <div className="text-center py-8 text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
                  No available tasks
                </div>
              ) : (
                backlogTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={onEditTask}
                    actionButton={
                      <button
                        onClick={(e) => { e.stopPropagation(); onAddToSprint(task.id); }}
                        className="p-1 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-hover)] transition-colors"
                        title="Add to sprint"
                      >
                        <Plus className="h-3.5 w-3.5" style={{ color: '#16A34A' }} />
                      </button>
                    }
                  />
                ))
              )}
            </div>
          </div>

          {/* Right panel: In Sprint */}
          <div className="flex-1 flex flex-col min-h-0 rounded-[8px] border-2 border-[#0D0D0D] shadow-[2px_2px_0px_#0D0D0D] overflow-hidden"
            style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <div className="flex items-center justify-between px-4 py-2.5 border-b-2 border-[#0D0D0D] flex-shrink-0"
              style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
              <h3 className="text-sm font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
                In Sprint ({sprintTasks.length})
              </h3>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border"
                style={{ borderColor: 'var(--color-border-primary)', color: 'var(--color-text-tertiary)' }}>
                ← remove
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {sprintTasks.length === 0 ? (
                <div className="text-center py-8 text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
                  No tasks in this sprint yet
                </div>
              ) : (
                sprintTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={onEditTask}
                    actionButton={
                      <button
                        onClick={(e) => { e.stopPropagation(); onRemoveFromSprint(task.id); }}
                        className="p-1 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-hover)] transition-colors"
                        title="Remove from sprint"
                      >
                        <X className="h-3.5 w-3.5" style={{ color: 'var(--color-error)' }} />
                      </button>
                    }
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ZapIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}