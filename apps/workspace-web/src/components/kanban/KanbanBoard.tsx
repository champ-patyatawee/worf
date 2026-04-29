import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { kanbanApi } from '@/services/kanbanApi';
import type { Board, Task } from '@/types/kanban';
import { KanbanColumn } from './KanbanColumn';
import { KanbanTaskModal } from './KanbanTaskModal';
import { Plus } from 'lucide-react';

const COLUMNS: { id: Task['status']; label: string }[] = [
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
      const data = await kanbanApi.getBoard(id);
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

  const handleMoveTask = async (taskId: string, newStatus: Task['status'], insertIndex?: number) => {
    const tasksInTarget = tasks.filter((t) => t.status === newStatus && t.id !== taskId).length;
    const position = insertIndex ?? tasksInTarget;

    setTasks((prev) => {
      const task = prev.find((t) => t.id === taskId);
      if (!task) return prev;
      const newTs = prev
        .filter((t) => t.id !== taskId)
        .map((t) => ({
          ...t,
          position: t.status === newStatus
            ? t.position + (t.position >= position ? 1 : 0)
            : t.position,
        }));
      return [...newTs, { ...task, status: newStatus, position }];
    });

    try {
      await kanbanApi.moveTask(taskId, newStatus);
    } catch (err) {
      console.error('Failed to move task:', err);
      if (boardId) loadBoard(boardId);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await kanbanApi.deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleSaveTask = async (data: {
    title: string;
    description: string;
    priority: string;
    status: string;
  }) => {
    if (!boardId) return;
    try {
      if (editingTask) {
        const updated = await kanbanApi.updateTask(editingTask.id, data);
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const created = await kanbanApi.createTask({
          ...data,
          board_id: board!.id,
        });
        setTasks((prev) => [...prev, created]);
      }
      setIsModalOpen(false);
      setEditingTask(null);
    } catch (err) {
      console.error('Failed to save task:', err);
    }
  };

  const openCreateModal = (_status?: Task['status']) => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const getTasksByStatus = (status: Task['status']) =>
    tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position);

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
          <div className="w-16 h-16 mx-auto mb-4 rounded-[var(--radius-lg)] border-2 flex items-center justify-center" style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-bg-secondary)' }}>
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
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-3 border-b-2 flex-shrink-0"
        style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div>
          <h1 className="text-xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>{board.name}</h1>
          {board.description && (
            <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{board.description}</p>
          )}
        </div>
        <button
          onClick={() => openCreateModal()}
          className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border-2 text-sm font-bold transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none"
          style={{
            backgroundColor: 'var(--color-accent-primary)',
            borderColor: 'var(--color-border-primary)',
            color: 'white',
          }}
        >
          <Plus className="h-4 w-4" />
          New Task
        </button>
      </div>

      {/* Board Columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div className="flex gap-4 h-full min-w-max">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              status={column.id}
              label={column.label}
              tasks={getTasksByStatus(column.id)}
              onMoveTask={handleMoveTask}
              onEditTask={openEditModal}
              onDeleteTask={handleDeleteTask}
              onAddTask={() => openCreateModal(column.id)}
            />
          ))}
        </div>
      </div>

      {/* Task Modal */}
      <KanbanTaskModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
        onSave={handleSaveTask}
        task={editingTask}
      />
    </div>
  );
}
