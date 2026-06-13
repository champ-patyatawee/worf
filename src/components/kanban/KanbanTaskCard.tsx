import { useRef, useCallback, useEffect } from 'react';
import type { Task } from '../../types';
import { Pencil, Trash2, ArrowRight, ArrowLeft, GripVertical } from 'lucide-react';

// Module-level drag state shared between KanbanTaskCard and KanbanColumn
const dragState = {
  taskId: null as string | null,
  isDragging: false,
  ghostEl: null as HTMLElement | null,
  offsetX: 0,
  offsetY: 0,
};

export function getDraggedTaskId() {
  return dragState.isDragging ? dragState.taskId : null;
}

export function clearDraggedTaskId() {
  cleanupDrag();
}

function cleanupDrag() {
  if (dragState.ghostEl) {
    dragState.ghostEl.remove();
    dragState.ghostEl = null;
  }
  dragState.taskId = null;
  dragState.isDragging = false;
}

const priorityConfig: Record<string, { label: string; bg: string; text: string }> = {
  low: { label: 'Low', bg: 'rgba(156, 163, 175, 0.15)', text: '#6B7280' },
  medium: { label: 'Med', bg: 'rgba(250, 204, 21, 0.15)', text: '#CA8A04' },
  high: { label: 'High', bg: 'rgba(251, 113, 133, 0.15)', text: '#E11D48' },
};

export function KanbanTaskCard({ task, onMove, onEdit, onDelete }: {
  task: Task; onMove: (id: string, s: string) => void;
  onEdit: (t: Task) => void; onDelete: (id: string) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  const p = priorityConfig[task.priority] || priorityConfig.medium;
  const next = task.status === 'todo' ? 'in_progress' : task.status === 'in_progress' ? 'done' : null;
  const prev = task.status === 'done' ? 'in_progress' : task.status === 'in_progress' ? 'todo' : null;

  // Global pointermove handler — moves the ghost element
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!dragState.isDragging || !dragState.ghostEl) return;
    dragState.ghostEl.style.left = `${e.clientX - dragState.offsetX}px`;
    dragState.ghostEl.style.top = `${e.clientY - dragState.offsetY}px`;
  }, []);

  // Global pointerup handler — performs the drop
  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (!dragState.isDragging || !dragState.taskId) {
      cleanupDrag();
      return;
    }

    const taskId = dragState.taskId;
    cleanupDrag();

    // Restore original card opacity
    if (cardRef.current) {
      cardRef.current.style.opacity = '';
      cardRef.current.style.cursor = '';
    }

    // Find column under pointer via data-kanban-column attribute
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el) {
      const column = el.closest('[data-kanban-column]');
      if (column) {
        const targetStatus = column.getAttribute('data-kanban-column');
        if (targetStatus) {
          onMove(taskId, targetStatus);
        }
      }
    }
  }, [onMove]);

  // Register/unregister global listeners
  useEffect(() => {
    const moveHandler = handlePointerMove;
    const upHandler = handlePointerUp;
    document.addEventListener('pointermove', moveHandler);
    document.addEventListener('pointerup', upHandler);
    return () => {
      document.removeEventListener('pointermove', moveHandler);
      document.removeEventListener('pointerup', upHandler);
      cleanupDrag();
    };
  }, [handlePointerMove, handlePointerUp]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    const card = cardRef.current;
    if (!card) return;

    // Record drag start
    dragState.taskId = task.id;
    dragState.isDragging = true;
    dragState.offsetX = e.clientX - card.getBoundingClientRect().left;
    dragState.offsetY = e.clientY - card.getBoundingClientRect().top;

    // Create floating ghost clone
    const ghost = card.cloneNode(true) as HTMLElement;
    ghost.style.position = 'fixed';
    ghost.style.left = `${e.clientX - dragState.offsetX}px`;
    ghost.style.top = `${e.clientY - dragState.offsetY}px`;
    ghost.style.width = `${card.offsetWidth}px`;
    ghost.style.zIndex = '9999';
    ghost.style.pointerEvents = 'none';
    ghost.style.opacity = '0.85';
    ghost.style.transform = 'rotate(3deg) scale(1.02)';
    ghost.style.boxShadow = '8px 8px 0px #0D0D0D';
    ghost.style.transition = 'none';
    // Hide action buttons in ghost
    ghost.querySelectorAll('button').forEach((btn) => { btn.style.opacity = '0'; });
    document.body.appendChild(ghost);
    dragState.ghostEl = ghost;

    // Dim the original card
    card.style.opacity = '0.3';
    card.style.cursor = 'grabbing';

    e.preventDefault();
  }, [task.id]);

  return (
    <div
      ref={cardRef}
      onPointerDown={handlePointerDown}
      className="group rounded-[var(--radius-md)] border-2 p-3 transition-all hover:shadow-[2px_2px_0px_#0D0D0D] cursor-grab active:cursor-grabbing select-none touch-none"
      style={{
        backgroundColor: 'var(--color-bg-primary)',
        borderColor: 'var(--color-border-primary)',
        touchAction: 'none',
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-start gap-1.5">
          <GripVertical className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
          <h4 className="text-sm font-bold leading-tight" style={{ color: 'var(--color-text-primary)' }}>{task.title}</h4>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(task)} className="p-1 rounded hover:bg-[var(--color-bg-hover)]"><Pencil className="h-3 w-3" style={{ color: 'var(--color-text-tertiary)' }} /></button>
          <button onClick={() => onDelete(task.id)} className="p-1 rounded hover:bg-[var(--color-bg-hover)]"><Trash2 className="h-3 w-3" style={{ color: 'var(--color-error)' }} /></button>
        </div>
      </div>
      {task.description && <p className="text-xs font-medium mb-2 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>{task.description}</p>}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 uppercase tracking-wide"
          style={{ backgroundColor: p.bg, color: p.text, borderColor: 'var(--color-border-primary)' }}>{p.label}</span>
        <div className="flex items-center gap-1">
          {prev && <button onClick={() => onMove(task.id, prev)} className="p-1 rounded hover:bg-[var(--color-bg-hover)]"><ArrowLeft className="h-3 w-3" style={{ color: 'var(--color-text-tertiary)' }} /></button>}
          {next && <button onClick={() => onMove(task.id, next)} className="p-1 rounded hover:bg-[var(--color-bg-hover)]"><ArrowRight className="h-3 w-3" style={{ color: 'var(--color-text-tertiary)' }} /></button>}
        </div>
      </div>
    </div>
  );
}
