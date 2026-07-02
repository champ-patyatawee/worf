import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Task, Sprint } from '../../types';
import { Plus, Trash2, AlertCircle, Clock, ChevronDown, ChevronRight, X, Play, Pencil, ExternalLink } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

// Module-level drag state for backlog → sprint drag-and-drop
const backlogDragState = {
  taskId: null as string | null,
  sourceSprintId: null as string | null,
  isDragging: false,
  ghostEl: null as HTMLElement | null,
  offsetX: 0,
  offsetY: 0,
  sourceEl: null as HTMLElement | null,
};

function cleanupBacklogDrag() {
  if (backlogDragState.ghostEl) {
    backlogDragState.ghostEl.remove();
    backlogDragState.ghostEl = null;
  }
  if (backlogDragState.sourceEl) {
    backlogDragState.sourceEl.style.opacity = '';
    backlogDragState.sourceEl.style.cursor = '';
  }
  backlogDragState.taskId = null;
  backlogDragState.sourceSprintId = null;
  backlogDragState.isDragging = false;
  backlogDragState.sourceEl = null;
}

interface KanbanBacklogProps {
  tasks: Task[];
  sprints: Sprint[];
  planningSprints: Sprint[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: () => void;
  onCreateSprint: () => void;
  onStartSprint: (sprintId: string) => void;
  onEditSprint: (sprint: Sprint) => void;
  onDeleteSprint: (sprintId: string) => void;
  onAddToSprint: (taskId: string, sprintId: string) => void;
  onRemoveFromSprint: (taskId: string, sprintId: string) => void;
}

const priorityConfig: Record<string, { dot: ReactNode; color: string }> = {
  low: { dot: <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />, color: '#6B7280' },
  medium: { dot: <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-500" />, color: '#CA8A04' },
  high: { dot: <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />, color: '#E11D48' },
};

function DueDateBadge({ dueDate }: { dueDate: string }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const isOverdue = due < today;
  const isToday = due.getTime() === today.getTime();

  const formatted = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  let bg = 'rgba(156, 163, 175, 0.12)';
  let text = '#6B7280';
  let icon = null;

  if (isOverdue) {
    bg = 'rgba(239, 68, 68, 0.15)';
    text = '#DC2626';
    icon = <AlertCircle className="h-3 w-3 flex-shrink-0" />;
  } else if (isToday) {
    bg = 'rgba(251, 191, 36, 0.15)';
    text = '#D97706';
    icon = <Clock className="h-3 w-3 flex-shrink-0" />;
  }

  return (
    <div className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border w-fit"
      style={{ backgroundColor: bg, color: text, borderColor: 'var(--color-border-primary)' }}>
      {icon}
      <span>{formatted}</span>
    </div>
  );
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${s.toLocaleDateString('en-US', opts)} - ${e.toLocaleDateString('en-US', opts)}`;
}

function SprintSection({
  sprint,
  allTasks,
  isExpanded,
  onToggle,
  onStartSprint,
  onEditSprint,
  onDeleteSprint,
  onAddToSprint,
  onRemoveFromSprint,
  onEditTask,
}: {
  sprint: Sprint;
  allTasks: Task[];
  isExpanded: boolean;
  onToggle: () => void;
  onStartSprint: (sprintId: string) => void;
  onEditSprint: (sprint: Sprint) => void;
  onDeleteSprint: (sprintId: string) => void;
  onAddToSprint: (taskId: string, sprintId: string) => void;
  onRemoveFromSprint: (taskId: string, sprintId: string) => void;
  onEditTask: (task: Task) => void;
}) {
  const sprintTasks = allTasks.filter(t => t.sprint_id === sprint.id);
  const sortedTasks = [...sprintTasks].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.priority as keyof typeof order] ?? 1) - (order[b.priority as keyof typeof order] ?? 1);
  });

  return (
    <div
      data-sprint-id={sprint.id}
      data-sprint-drop="true"
      className="border-2 border-[#0D0D0D] rounded-[12px] overflow-hidden transition-all"
      style={{
        backgroundColor: 'var(--color-bg-primary)',
        borderColor: 'var(--color-border-primary)',
        borderLeft: sprint.status === 'active' ? '4px solid #16A34A' : '4px solid #CA8A04',
      }}
    >
      {/* Header — clickable to toggle */}
      <div
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[var(--color-bg-hover)] cursor-pointer"
        style={{ backgroundColor: 'var(--color-bg-secondary)' }}
      >
        <span className="flex-shrink-0 text-base">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: sprint.status === 'active' ? '#16A34A' : '#CA8A04' }} />
          <span className="font-extrabold text-base truncate" style={{ color: 'var(--color-text-primary)' }}>
            {sprint.name}
          </span>
          <span
            className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: sprint.status === 'active' ? 'rgba(22, 163, 74, 0.15)' : 'rgba(202, 138, 4, 0.15)',
              color: sprint.status === 'active' ? '#16A34A' : '#CA8A04',
            }}
          >
            {sprint.status === 'active' ? 'Active' : 'Planning'}
          </span>
        </div>
        <span className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
          {formatDateRange(sprint.start_date, sprint.end_date)}
        </span>
        {!isExpanded && sprintTasks.length > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0"
            style={{ borderColor: 'var(--color-border-primary)', color: 'var(--color-text-tertiary)' }}>
            {sprintTasks.length} tasks
          </span>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-5 pb-4">
          {/* Goal */}
          {sprint.goal && (
            <div className="mt-3 mb-3 text-xs font-semibold flex items-center gap-1.5"
              style={{ color: 'var(--color-text-secondary)' }}>
              <ExternalLink className="h-3 w-3" />
              <span>Goal: {sprint.goal}</span>
            </div>
          )}

          {/* Sprint tasks */}
          {sortedTasks.length === 0 ? (
            <div className="py-4 text-center border-2 border-dashed rounded-[8px]"
              style={{ borderColor: 'var(--color-border-primary)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
                No tasks in this sprint yet. Add tasks from the backlog above.
              </p>
            </div>
          ) : (
            <div className="space-y-2 mb-3">
              {sortedTasks.map((task) => {
                const p = priorityConfig[task.priority] || priorityConfig.medium;
                return (
                  <div
                    key={task.id}
                    data-task-id={task.id}
                    onClick={() => onEditTask(task)}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      const target = e.target as HTMLElement;
                      if (target.closest('button')) return;

                      const card = e.currentTarget as HTMLElement;

                      backlogDragState.taskId = task.id;
                      backlogDragState.sourceSprintId = sprint.id;
                      backlogDragState.isDragging = true;
                      backlogDragState.offsetX = e.clientX - card.getBoundingClientRect().left;
                      backlogDragState.offsetY = e.clientY - card.getBoundingClientRect().top;
                      backlogDragState.sourceEl = card;
                      card.style.opacity = '0.3';
                      card.style.cursor = 'grabbing';

                      // Create floating ghost clone
                      const ghost = card.cloneNode(true) as HTMLElement;
                      ghost.style.position = 'fixed';
                      ghost.style.left = `${e.clientX - backlogDragState.offsetX}px`;
                      ghost.style.top = `${e.clientY - backlogDragState.offsetY}px`;
                      ghost.style.width = `${card.offsetWidth}px`;
                      ghost.style.zIndex = '9999';
                      ghost.style.pointerEvents = 'none';
                      ghost.style.opacity = '0.85';
                      ghost.style.transform = 'rotate(3deg) scale(1.02)';
                      ghost.style.boxShadow = '8px 8px 0px #0D0D0D';
                      ghost.style.transition = 'none';
                      // Hide buttons in ghost
                      ghost.querySelectorAll('button').forEach((btn) => { btn.style.opacity = '0'; });
                      document.body.appendChild(ghost);
                      backlogDragState.ghostEl = ghost;

                      e.preventDefault();
                    }}
                    className="group flex items-center gap-3 px-3 py-2.5 border-2 border-[#0D0D0D] rounded-[8px] shadow-[2px_2px_0px_#0D0D0D] cursor-grab active:cursor-grabbing select-none touch-none transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#0D0D0D]"
                    style={{ backgroundColor: 'var(--color-bg-primary)', touchAction: 'none' }}
                  >
                    <span className="text-base flex-shrink-0">{p.dot}</span>
                    <span className="flex-1 text-sm font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {task.title}
                    </span>
                    {task.due_date && (
                      <div className="flex-shrink-0">
                        <DueDateBadge dueDate={task.due_date} />
                      </div>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemoveFromSprint(task.id, sprint.id); }}
                      className="p-1.5 rounded-[var(--radius-sm)] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--color-bg-hover)] flex-shrink-0"
                      title="Remove from sprint"
                    >
                      <X className="h-3.5 w-3.5" style={{ color: 'var(--color-error)' }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2 border-t-2"
            style={{ borderColor: 'var(--color-border-primary)' }}>
            <button
              onClick={(e) => { e.stopPropagation(); onStartSprint(sprint.id); }}
              disabled={sprintTasks.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-[var(--radius-md)] border-2 border-[#0D0D0D] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              style={{ backgroundColor: '#16A34A', color: 'white' }}
            >
              <Play className="h-3 w-3" /> Start Sprint
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEditSprint(sprint); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--radius-md)] border-2 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none"
              style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-primary)', color: 'var(--color-text-primary)' }}
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteSprint(sprint.id); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--radius-md)] border-2 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none"
              style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-primary)', color: 'var(--color-error)' }}
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function KanbanBacklog({
  tasks,
  sprints,
  planningSprints,
  onEditTask,
  onDeleteTask,
  onAddTask,
  onCreateSprint,
  onStartSprint,
  onEditSprint,
  onDeleteSprint,
  onAddToSprint,
  onRemoveFromSprint,
}: KanbanBacklogProps) {
  const [expandedSprints, setExpandedSprints] = useState<Set<string>>(() =>
    new Set(planningSprints.map(s => s.id))
  );

  const toggleSprint = (sprintId: string) => {
    setExpandedSprints(prev => {
      const next = new Set(prev);
      if (next.has(sprintId)) {
        next.delete(sprintId);
      } else {
        next.add(sprintId);
      }
      return next;
    });
  };

  // Global pointer event handlers for backlog ↔ sprint drag-and-drop
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!backlogDragState.isDragging || !backlogDragState.ghostEl) return;
      backlogDragState.ghostEl.style.left = `${e.clientX - backlogDragState.offsetX}px`;
      backlogDragState.ghostEl.style.top = `${e.clientY - backlogDragState.offsetY}px`;
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!backlogDragState.isDragging || !backlogDragState.taskId) {
        cleanupBacklogDrag();
        return;
      }

      const taskId = backlogDragState.taskId;
      const sourceSprintId = backlogDragState.sourceSprintId;

      // Restore source element
      if (backlogDragState.sourceEl) {
        backlogDragState.sourceEl.style.opacity = '';
      }

      cleanupBacklogDrag();

      // Find drop target
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el) {
        // Check for sprint section
        const sprintSection = el.closest('[data-sprint-drop]');
        if (sprintSection) {
          const sprintId = sprintSection.getAttribute('data-sprint-id');
          if (sprintId && sourceSprintId !== sprintId) {
            if (sourceSprintId === null) {
              onAddToSprint(taskId, sprintId);
            } else {
              onRemoveFromSprint(taskId, sourceSprintId);
              onAddToSprint(taskId, sprintId);
            }
            return;
          }
        }

        // Check for backlog drop zone
        const backlogDrop = el.closest('[data-backlog-drop]');
        if (backlogDrop && sourceSprintId !== null) {
          onRemoveFromSprint(taskId, sourceSprintId);
          return;
        }
      }

      // FALLBACK: If the task was in a sprint and wasn't dropped on another sprint
      // section or the backlog drop zone, treat it as a return to backlog.
      // This means the user can drop a sprint task anywhere on the page
      // to move it back to the backlog.
      if (sourceSprintId !== null) {
        console.log('[DRAG] FALLBACK - moving task', taskId, 'from sprint', sourceSprintId, 'to backlog');
        onRemoveFromSprint(taskId, sourceSprintId);
        return;
      }
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      cleanupBacklogDrag();
    };
  }, [onAddToSprint, onRemoveFromSprint]);

  // Sort backlog tasks by priority
  const sortedBacklog = tasks
    .filter(t => !t.sprint_id)
    .sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.priority as keyof typeof order] ?? 1) - (order[b.priority as keyof typeof order] ?? 1);
  });

  // All tasks passed in (backlog + sprint tasks)
  const allTasks = tasks;
  const hasBacklogTasks = sortedBacklog.length > 0;
  const hasPlanningSprints = planningSprints.length > 0;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* ===== BACKLOG SECTION ===== */}
        <div
          data-backlog-drop="true"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
              Backlog ({sortedBacklog.length} items)
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={onAddTask}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--radius-md)] border-2 border-[#0D0D0D] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none"
                style={{ backgroundColor: 'var(--color-accent-primary)', color: 'white' }}>
                <Plus className="h-3.5 w-3.5" /> New Task
              </button>
            </div>
          </div>

          <div
            className="transition-all rounded-[8px] -mx-2 px-2 py-1"
          >
          {!hasBacklogTasks ? (
            <div
              className="text-center py-12 border-2 border-dashed rounded-[8px]"
              style={{ borderColor: 'var(--color-border-primary)' }}
            >
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
                No backlog tasks. Create a new task to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedBacklog.map((task) => {
                const p = priorityConfig[task.priority] || priorityConfig.medium;
                return (
                  <div
                    key={task.id}
                    data-task-id={task.id}
                    onClick={() => onEditTask(task)}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      const target = e.target as HTMLElement;
                      if (target.closest('button')) return;

                      const card = e.currentTarget as HTMLElement;

                      backlogDragState.taskId = task.id;
                      backlogDragState.sourceSprintId = null;
                      backlogDragState.isDragging = true;
                      backlogDragState.offsetX = e.clientX - card.getBoundingClientRect().left;
                      backlogDragState.offsetY = e.clientY - card.getBoundingClientRect().top;
                      backlogDragState.sourceEl = card;
                      card.style.opacity = '0.3';
                      card.style.cursor = 'grabbing';

                      // Create floating ghost clone
                      const ghost = card.cloneNode(true) as HTMLElement;
                      ghost.style.position = 'fixed';
                      ghost.style.left = `${e.clientX - backlogDragState.offsetX}px`;
                      ghost.style.top = `${e.clientY - backlogDragState.offsetY}px`;
                      ghost.style.width = `${card.offsetWidth}px`;
                      ghost.style.zIndex = '9999';
                      ghost.style.pointerEvents = 'none';
                      ghost.style.opacity = '0.85';
                      ghost.style.transform = 'rotate(3deg) scale(1.02)';
                      ghost.style.boxShadow = '8px 8px 0px #0D0D0D';
                      ghost.style.transition = 'none';
                      // Hide buttons in ghost
                      ghost.querySelectorAll('button').forEach((btn) => { btn.style.opacity = '0'; });
                      document.body.appendChild(ghost);
                      backlogDragState.ghostEl = ghost;

                      e.preventDefault();
                    }}
                    className="group flex items-center gap-3 px-4 py-3 border-2 border-[#0D0D0D] rounded-[8px] shadow-[2px_2px_0px_#0D0D0D] cursor-grab active:cursor-grabbing select-none touch-none transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0px_#0D0D0D]"
                    style={{ backgroundColor: 'var(--color-bg-primary)', touchAction: 'none' }}
                  >
                    <span className="text-base flex-shrink-0">{p.dot}</span>
                    <span className="flex-1 text-sm font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {task.title}
                    </span>
                    {task.due_date && (
                      <div className="flex-shrink-0">
                        <DueDateBadge dueDate={task.due_date} />
                      </div>
                    )}
                    {/* Move to Sprint dropdown */}
                    {planningSprints.length > 0 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-[var(--radius-sm)] border-2 opacity-0 group-hover:opacity-100 transition-all hover:bg-[var(--color-bg-hover)] flex-shrink-0"
                            style={{ borderColor: 'var(--color-border-primary)', color: 'var(--color-text-secondary)' }}
                          >
                            → Sprint
                          </button>
                        </PopoverTrigger>
                        <PopoverContent sideOffset={5} align="end" className="w-48 p-1">
                          <div className="text-[10px] font-bold px-2 py-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
                            Move to sprint
                          </div>
                          {planningSprints.map((sprint) => (
                            <button
                              key={sprint.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddToSprint(task.id, sprint.id);
                              }}
                              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-semibold rounded-[var(--radius-sm)] transition-colors hover:bg-[var(--color-bg-hover)] text-left"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-500" />
                              <span className="truncate">{sprint.name}</span>
</button>
                          ))}
                        </PopoverContent>
                      </Popover>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                      className="p-1.5 rounded-[var(--radius-sm)] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--color-bg-hover)] flex-shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--color-error)' }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>

        {/* ===== PLANNING SPRINTS SECTION ===== */}
        {hasPlanningSprints ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
                Planning Sprints
              </h2>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border"
                style={{ borderColor: 'var(--color-border-primary)', color: 'var(--color-text-tertiary)' }}>
                {planningSprints.length}
              </span>
            </div>
            {planningSprints.map((sprint) => (
              <SprintSection
                key={sprint.id}
                sprint={sprint}
                allTasks={allTasks}
                isExpanded={expandedSprints.has(sprint.id)}
                onToggle={() => toggleSprint(sprint.id)}
                onStartSprint={onStartSprint}
                onEditSprint={onEditSprint}
                onDeleteSprint={onDeleteSprint}
                onAddToSprint={onAddToSprint}
                onRemoveFromSprint={onRemoveFromSprint}
                onEditTask={onEditTask}
              />
            ))}
          </div>
        ) : (
          /* Empty state when no planning sprints */
          <div
            className="text-center py-12 border-2 border-dashed rounded-[8px]"
            style={{ borderColor: 'var(--color-border-primary)' }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
              No planning sprints yet.
            </p>
            <p className="text-xs font-medium mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
              Create a sprint to start planning.
            </p>
          </div>
        )}

        {/* ===== BOTTOM ACTION BUTTONS ===== */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onCreateSprint}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-[var(--radius-md)] border-2 border-[#0D0D0D] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none"
            style={{ backgroundColor: 'var(--color-accent-primary)', color: 'white' }}
          >
            <Plus className="h-4 w-4" /> Create Sprint
          </button>
          <button
            onClick={onAddTask}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-[var(--radius-md)] border-2 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none"
            style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-primary)', color: 'var(--color-text-primary)' }}
          >
            <Plus className="h-4 w-4" /> New Task
          </button>
        </div>
      </div>
    </div>
  );
}