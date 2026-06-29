import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import type { Board, Task } from '../../types';
import { KanbanColumn } from './KanbanColumn';
import { KanbanTaskModal } from './KanbanTaskModal';
import { Plus } from 'lucide-react';

const COLUMNS: { id: string; label: string }[] = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
];

export function KanbanBoard() {
  const { boardId } = useParams<{ boardId: string }>();
  const [board, setBoard] = useState<Board | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const loadBoard = useCallback(async (id: string) => {
    try {
      const data = await invoke<any>('get_board', { idOrSlug: id });
      setBoard(data);
      setTasks(data.tasks || []);
    } catch (err) {
      console.error('Failed to load board:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (boardId) {
      setLoading(true);
      loadBoard(boardId);
    } else {
      setBoard(null);
      setTasks([]);
      setLoading(false);
    }
  }, [boardId, loadBoard]);

  const handleMoveTask = async (taskId: string, newStatus: string) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
    try {
      await invoke('move_task', { id: taskId, status: newStatus, position: null });
    } catch (err) {
      console.error('Failed to move task:', err);
      if (boardId) loadBoard(boardId);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await invoke('delete_task', { id: taskId });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleSaveTask = async (data: { title: string; description: string; priority: string; status: string; due_date: string | null; sprint_id: string | null }) => {
    if (!boardId || !board) return;
    try {
      if (editingTask) {
        const updated = await invoke<Task>('update_task', {
          id: editingTask.id, title: data.title,
          description: data.description || null, priority: data.priority, status: data.status, due_date: data.due_date, sprint_id: data.sprint_id,
        });
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const created = await invoke<Task>('create_task', {
          title: data.title, description: data.description || null,
          priority: data.priority, status: data.status, boardId: board.id, due_date: data.due_date, sprint_id: data.sprint_id,
        });
        setTasks((prev) => [...prev, created]);
      }
      setIsModalOpen(false);
      setEditingTask(null);
    } catch (err) {
      console.error('Failed to save task:', err);
    }
  };

  const openCreateModal = () => { setEditingTask(null); setIsModalOpen(true); };
  const openEditModal = (task: Task) => { setEditingTask(task); setIsModalOpen(true); };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="animate-spin rounded-full h-7 w-7 border-2" style={{ borderColor: 'var(--color-text-tertiary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!boardId || !board) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-[var(--radius-lg)] border-2 flex items-center justify-center"
            style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-bg-secondary)' }}>
            <Plus className="h-8 w-8" style={{ color: 'var(--color-text-tertiary)' }} />
          </div>
          <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Select a project</p>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Choose a project from the sidebar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="flex items-center justify-between px-6 py-3 border-b-2 flex-shrink-0"
        style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-bg-primary)' }}>
        <div>
          <h1 className="text-xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>{board.name}</h1>
          {board.description && (
            <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{board.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={openCreateModal}
            className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border-2 text-sm font-bold transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none"
            style={{ backgroundColor: 'var(--color-accent-primary)', borderColor: 'var(--color-border-primary)', color: 'white' }}>
            <Plus className="h-4 w-4" /> New Task
          </button>
        </div>
      </div>

      {/* Columns */}
      <div className="flex-1 overflow-x-scroll overflow-y-hidden scrollbar-thin p-4"
        onWheel={(e) => {
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.currentTarget.scrollLeft += e.deltaY;
            e.preventDefault();
          }
        }}>
        <div className="flex gap-4 h-full" style={{ width: 'max-content', minWidth: 'calc(100% + 300px)' }}>
          {COLUMNS.map((column) => (
            <KanbanColumn key={column.id} status={column.id} label={column.label}
              tasks={tasks.filter(t => t.status === column.id).sort((a, b) => a.position - b.position)}
              onMoveTask={handleMoveTask} onEditTask={openEditModal}
              onDeleteTask={handleDeleteTask} onAddTask={openCreateModal} />
          ))}
        </div>
      </div>

      {/* Modals */}
      <KanbanTaskModal isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
        onSave={handleSaveTask} task={editingTask}
        sprints={[]} activeSprintId={null} />
    </div>
  );
}