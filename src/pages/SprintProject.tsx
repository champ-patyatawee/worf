import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import type { Board, Task, Sprint, SprintCompleteSummary } from '../types';
import { KanbanColumn } from '../components/kanban/KanbanColumn';
import { KanbanBacklog } from '../components/kanban/KanbanBacklog';
import { KanbanTaskModal } from '../components/kanban/KanbanTaskModal';
import { SprintBar } from '../components/kanban/SprintBar';
import { SprintCreateModal } from '../components/kanban/SprintCreateModal';
import { SprintReviewDialog } from '../components/kanban/SprintReviewDialog';
import { SprintCompleteDialog } from '../components/kanban/SprintCompleteDialog';
import { SprintSidebar } from '../components/sprint/SprintSidebar';
import { Plus, Timer } from 'lucide-react';

const COLUMNS: { id: string; label: string }[] = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
];

export function SprintProject() {
  const { boardId } = useParams<{ boardId: string }>();
  const [board, setBoard] = useState<Board | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [activeSprintId, setActiveSprintId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showSprintCreateModal, setShowSprintCreateModal] = useState(false);
  const [sprintToComplete, setSprintToComplete] = useState<Sprint | null>(null);

  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);

  // Sprint review state
  const [sprintReviewOpen, setSprintReviewOpen] = useState(false);
  const [sprintReviewData, setSprintReviewData] = useState<{
    sprint: Sprint | null;
    completedTasks: Task[];
    backlogTasks: Task[];
    summary: SprintCompleteSummary | null;
  }>({ sprint: null, completedTasks: [], backlogTasks: [], summary: null });

  const loadBoardData = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const data = await invoke<any>('get_board', { idOrSlug: id });
      setBoard(data);
      setTasks(data.tasks || []);
    } catch (err) {
      console.error('Failed to load board:', err);
      setBoard(null);
      setTasks([]);
    }
    setLoading(false);
  }, []);

  const loadSprints = useCallback(async (id: string) => {
    try {
      const sprintList = await invoke<Sprint[]>('list_sprints', { boardId: id });
      setSprints(sprintList);

      const active = sprintList.find(s => s.status === 'active');
      if (active) {
        setActiveSprintId(active.id);
      } else {
        setActiveSprintId(null);
      }
    } catch (err) {
      console.error('Failed to load sprints:', err);
    }
  }, []);

  // When boardId changes, load board data (resolves slug -> UUID)
  useEffect(() => {
    if (boardId) {
      loadBoardData(boardId);
      // Don't call loadSprints here — it needs the resolved board.id (UUID)
    } else {
      setBoard(null);
      setTasks([]);
      setSprints([]);
      setActiveSprintId(null);
    }
  }, [boardId, loadBoardData]);

  // Load sprints when board is resolved (uses UUID from board.id)
  useEffect(() => {
    if (board) {
      loadSprints(board.id);
    }
  }, [board, loadSprints]);

  const handleMoveTask = async (taskId: string, newStatus: string) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
    try {
      await invoke('move_task', { id: taskId, status: newStatus, position: null });
    } catch (err) {
      console.error('Failed to move task:', err);
      if (boardId) loadBoardData(boardId);
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
          description: data.description || null, priority: data.priority, status: data.status, dueDate: data.due_date, sprintId: data.sprint_id,
        });
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const created = await invoke<Task>('create_task', {
          title: data.title, description: data.description || null,
          priority: data.priority, status: data.status, boardId: board.id, dueDate: data.due_date, sprintId: data.sprint_id,
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

  const handleCreateSprint = async (data: { name: string; goal: string; startDate: string; endDate: string }) => {
    if (!boardId || !board) return;
    try {
      const created = await invoke<Sprint>('create_sprint', {
        boardId: board.id, name: data.name, goal: data.goal || null, startDate: data.startDate, endDate: data.endDate,
      });
      setSprints((prev) => [...prev, created]);
      setShowSprintCreateModal(false);
    } catch (err) {
      console.error('Failed to create sprint:', err);
    }
  };

  const handleUpdateSprint = async (data: { name: string; goal: string; startDate: string; endDate: string }) => {
    if (!editingSprint) return;
    try {
      const updated = await invoke<Sprint>('update_sprint', {
        id: editingSprint.id,
        name: data.name,
        goal: data.goal || null,
        startDate: data.startDate,
        endDate: data.endDate,
      });
      setSprints((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setEditingSprint(null);
    } catch (err) {
      console.error('Failed to update sprint:', err);
    }
  };

  const handleStartSprint = async (sprintId: string) => {
    try {
      const updated = await invoke<Sprint>('start_sprint', { id: sprintId });
      setSprints((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setActiveSprintId(updated.id);
    } catch (err) {
      console.error('Failed to start sprint:', err);
    }
  };

  const handleEditSprint = async (sprint: Sprint) => {
    setEditingSprint(sprint);
  };

  const handleDeleteSprint = async (sprintId: string) => {
    try {
      await invoke('delete_sprint', { id: sprintId });
      setSprints((prev) => prev.filter((s) => s.id !== sprintId));
      // Move tasks from this sprint back to backlog
      setTasks((prev) => prev.map((t) => t.sprint_id === sprintId ? { ...t, sprint_id: null } : t));
    } catch (err) {
      console.error('Failed to delete sprint:', err);
    }
  };

  const handleCompleteSprint = async () => {
    if (!sprintToComplete) return;
    try {
      const summary = await invoke<SprintCompleteSummary>('complete_sprint', { id: sprintToComplete.id });

      const sprintTasks = tasks.filter(t => t.sprint_id === sprintToComplete.id);
      const reviewCompleted = sprintTasks.filter(t => t.status === 'done');
      const reviewBacklog = sprintTasks.filter(t => t.status !== 'done');

      setSprintReviewData({
        sprint: sprintToComplete,
        completedTasks: reviewCompleted,
        backlogTasks: reviewBacklog,
        summary,
      });
      setSprintReviewOpen(true);
      setSprintToComplete(null);

      if (boardId && board) {
        await loadBoardData(boardId);
        await loadSprints(board.id);
      }
    } catch (err) {
      console.error('Failed to complete sprint:', err);
    }
  };

  const handleSelectSprint = (sprintId: string | null) => {
    setActiveSprintId(sprintId);
  };

  const handleAddToSprint = async (taskId: string, sprintId: string) => {
    console.log('[SPRINT] handleAddToSprint called - taskId:', taskId, 'sprintId:', sprintId);
    try {
      const updated = await invoke<Task>('update_task', { id: taskId, sprintId: sprintId });
      console.log('[SPRINT] update_task response:', updated);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      console.log('[SPRINT] setTasks complete');
    } catch (err) {
      console.error('[SPRINT] Failed to add task to sprint:', err);
    }
  };

  const handleRemoveFromSprint = async (taskId: string, _sprintId: string) => {
    try {
      const updated = await invoke<Task>('update_task', { id: taskId, sprintId: '' });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      console.error('Failed to remove task from sprint:', err);
    }
  };

  const handleCloseReview = () => {
    setSprintReviewOpen(false);
    setSprintReviewData({ sprint: null, completedTasks: [], backlogTasks: [], summary: null });
    setActiveSprintId(null);
  };

  const currentSprint = activeSprintId ? sprints.find(s => s.id === activeSprintId) ?? null : null;
  const hasActiveSprint = sprints.some(s => s.status === 'active');
  const activeSprint = sprints.find(s => s.status === 'active') ?? null;
  const planningSprints = sprints.filter(s => s.status === 'planning');

  const sprintTasks = activeSprintId
    ? tasks.filter((t) => t.sprint_id === activeSprintId)
    : [];

  const backlogTasks = tasks.filter((t) => !t.sprint_id);

  const getTasksByStatus = (status: string) =>
    sprintTasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position);

  // Empty state: no boardId selected — show sidebar + empty state (like KanbanBoard)
  if (!boardId) {
    return (
      <div className="flex-1 flex">
        <SprintSidebar />
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-[var(--radius-lg)] border-2 flex items-center justify-center"
              style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-bg-secondary)' }}>
              <Timer className="h-8 w-8" style={{ color: 'var(--color-text-tertiary)' }} />
            </div>
            <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Select a sprint project</p>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Choose a sprint project from the sidebar
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render the main content area based on sprint state
  const renderContent = () => {
    // Mode 1: Active sprint exists → show kanban columns
    if (activeSprintId && currentSprint?.status === 'active') {
      return (
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
                tasks={getTasksByStatus(column.id)}
                onMoveTask={handleMoveTask} onEditTask={openEditModal}
                onDeleteTask={handleDeleteTask} onAddTask={openCreateModal} />
            ))}
          </div>
        </div>
      );
    }

    // Mode 2: No active sprint → show backlog + planning sprints
    return (
      <KanbanBacklog
        tasks={tasks}
        sprints={sprints}
        planningSprints={planningSprints}
        onEditTask={openEditModal}
        onDeleteTask={handleDeleteTask}
        onAddTask={openCreateModal}
        onCreateSprint={() => setShowSprintCreateModal(true)}
        onStartSprint={handleStartSprint}
        onEditSprint={handleEditSprint}
        onDeleteSprint={handleDeleteSprint}
        onAddToSprint={handleAddToSprint}
        onRemoveFromSprint={handleRemoveFromSprint}
      />
    );
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <SprintSidebar />
      <div className="flex-1 flex flex-col min-h-0" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b-2 flex-shrink-0"
          style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-bg-primary)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[var(--radius-md)] border-2 flex items-center justify-center"
              style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-accent-primary)' }}>
              <Timer className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
              {board ? board.name : 'Sprint Project'}
            </h1>
          </div>
        </div>

        {/* Sprint bar — only shown when there's an active sprint */}
        {board && hasActiveSprint && (
          <SprintBar
            sprints={sprints}
            activeSprintId={activeSprintId}
            onSelectSprint={handleSelectSprint}
            onStartSprint={handleStartSprint}
            onCompleteSprint={(id) => {
              const sprint = sprints.find((s) => s.id === id);
              if (sprint) setSprintToComplete(sprint);
            }}
            onCreateSprint={() => setShowSprintCreateModal(true)}
            boardId={board.id}
          />
        )}

        {/* Content area */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-7 w-7 border-2" style={{ borderColor: 'var(--color-text-tertiary)', borderTopColor: 'transparent' }} />
          </div>
        ) : !board ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-[var(--radius-lg)] border-2 flex items-center justify-center"
                style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-bg-secondary)' }}>
                <Timer className="h-8 w-8" style={{ color: 'var(--color-text-tertiary)' }} />
              </div>
              <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Sprint project not found</p>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                The selected project could not be loaded.
              </p>
            </div>
          </div>
        ) : (
          renderContent()
        )}

        {/* Modals */}
        <KanbanTaskModal isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
          onSave={handleSaveTask} task={editingTask}
          sprints={sprints} activeSprintId={activeSprintId}
          defaultSprintId={
            editingTask ? editingTask.sprint_id :
            currentSprint && (currentSprint.status === 'planning' || currentSprint.status === 'active')
              ? activeSprintId
              : null
          } />

        <SprintCreateModal
          isOpen={showSprintCreateModal}
          onClose={() => setShowSprintCreateModal(false)}
          onCreate={handleCreateSprint}
          sprintCount={sprints.length}
          editSprint={null}
        />

        <SprintCreateModal
          isOpen={editingSprint !== null}
          onClose={() => setEditingSprint(null)}
          onCreate={handleUpdateSprint}
          sprintCount={sprints.length}
          editSprint={editingSprint}
        />

        <SprintCompleteDialog
          isOpen={sprintToComplete !== null}
          sprint={sprintToComplete}
          onClose={() => setSprintToComplete(null)}
          onConfirm={handleCompleteSprint}
        />

        <SprintReviewDialog
          isOpen={sprintReviewOpen}
          sprint={sprintReviewData.sprint}
          completedTasks={sprintReviewData.completedTasks}
          backlogTasks={sprintReviewData.backlogTasks}
          summary={sprintReviewData.summary}
          onClose={handleCloseReview}
        />
      </div>
    </div>
  );
}