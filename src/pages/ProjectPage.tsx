import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import type { Board, Task, Sprint, SprintCompleteSummary, ObjectiveWithKRs } from '../types';
import { KanbanColumn } from '../components/kanban/KanbanColumn';
import { KanbanBacklog } from '../components/kanban/KanbanBacklog';
import { KanbanTaskModal } from '../components/kanban/KanbanTaskModal';
import { SprintBar } from '../components/kanban/SprintBar';
import { SprintCreateModal } from '../components/kanban/SprintCreateModal';
import { SprintReviewDialog } from '../components/kanban/SprintReviewDialog';
import { SprintCompleteDialog } from '../components/kanban/SprintCompleteDialog';
import { CalendarView } from '../components/kanban/CalendarView';
import { ProjectSidebar } from '../components/project/ProjectSidebar';
import { Columns3, RefreshCw, CalendarDays, Target, Plus, ExternalLink, ArrowUpRight } from 'lucide-react';

declare global { interface Window { __persistedProjectSlug?: string } }

const COLUMNS: { id: string; label: string }[] = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
];

const tabs = [
  { id: 'sprint', label: 'Sprint', icon: RefreshCw },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'okr', label: 'OKR', icon: Target },
];

export function ProjectPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();

  // Redirect to last opened project if none selected
  useEffect(() => {
    if (!boardId && window.__persistedProjectSlug) {
      navigate(`/project/${window.__persistedProjectSlug}`, { replace: true });
    }
  }, []);

  // Core state
  const [board, setBoard] = useState<Board | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [activeSprintId, setActiveSprintId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('board');
  const [error, setError] = useState<string | null>(null);

  // Modal states
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

  // OKR state
  const [linkedObjective, setLinkedObjective] = useState<ObjectiveWithKRs | null>(null);
  const [okrLoading, setOkrLoading] = useState(false);

  // ===== Data Loading =====
  const loadBoardData = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await invoke<any>('get_board', { idOrSlug: id });
      setBoard(data);
      setTasks(data.tasks || []);
    } catch (err: any) {
      console.error('Failed to load board:', err);
      setBoard(null);
      setTasks([]);
      setError(typeof err === 'string' ? err : 'Failed to load project');
    }
    setLoading(false);
  }, []);

  const loadSprints = useCallback(async (id: string) => {
    try {
      const sprintList = await invoke<Sprint[]>('list_sprints', { boardId: id });
      setSprints(sprintList);
      const active = sprintList.find(s => s.status === 'active');
      setActiveSprintId(active ? active.id : null);
    } catch (err) {
      console.error('Failed to load sprints:', err);
    }
  }, []);

  const loadLinkedObjective = useCallback(async (boardId: string) => {
    setOkrLoading(true);
    try {
      // Fetch objectives for this board via the existing get_objective for the objective_id
      // Boards link to objectives via board_objectives table
      // We query all objectives and check which ones reference this board
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const quarter = `Q${Math.ceil(month / 3)}`;
      
      // Try to fetch objectives linked to this board
      const linked = await invoke<any>('get_objectives_for_board', { boardId });
      if (linked && linked.objective) {
        setLinkedObjective(linked as ObjectiveWithKRs);
      } else {
        setLinkedObjective(null);
      }
    } catch (err) {
      // Try fallback: search through all objectives
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const quarter = `Q${Math.ceil(month / 3)}`;
        const objectives = await invoke<any[]>('list_objectives', { quarter, year });
        for (const obj of objectives) {
          try {
            const full = await invoke<any>('get_objective', { id: obj.id });
            if (full.board_ids && full.board_ids.includes(boardId)) {
              setLinkedObjective(full);
              setOkrLoading(false);
              return;
            }
          } catch { /* skip */ }
        }
        setLinkedObjective(null);
      } catch {
        setLinkedObjective(null);
      }
    }
    setOkrLoading(false);
  }, []);

  // When boardId changes, load board data
  useEffect(() => {
    if (boardId) {
      window.__persistedProjectSlug = boardId;
      setActiveTab('sprint');
      loadBoardData(boardId);
    } else {
      setBoard(null);
      setTasks([]);
      setSprints([]);
      setActiveSprintId(null);
      setLoading(false);
      setError(null);
    }
  }, [boardId, loadBoardData]);

  // Load sprints when board is resolved
  useEffect(() => {
    if (board) {
      loadSprints(board.id);
      loadLinkedObjective(board.id);
    }
  }, [board, loadSprints, loadLinkedObjective]);

  // ===== Task Actions =====
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

  // ===== Sprint Actions =====
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
    try {
      const updated = await invoke<Task>('update_task', { id: taskId, sprintId: sprintId });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      console.error('Failed to add task to sprint:', err);
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

  // ===== Derived state =====
  const currentSprint = activeSprintId ? sprints.find(s => s.id === activeSprintId) ?? null : null;
  const hasActiveSprint = sprints.some(s => s.status === 'active');
  const planningSprints = sprints.filter(s => s.status === 'planning' || s.status === 'active');

  const sprintTasks = activeSprintId
    ? tasks.filter((t) => t.sprint_id === activeSprintId)
    : [];

  const backlogTasks = tasks.filter((t) => !t.sprint_id);

  const getTasksByStatus = (status: string) =>
    sprintTasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position);

  // ===== Tab rendering =====
  const renderTabContent = () => {
    switch (activeTab) {
      case 'sprint':
        return renderSprintTab();
      case 'calendar':
        return renderCalendarTab();
      case 'okr':
        return renderOKRTab();
      default:
        return renderSprintTab();
    }
  };

  const renderSprintTab = () => {
    // Mode 1: Sprint selected → show kanban columns only (no backlog)
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

    // Mode 2: No sprint selected → show backlog + planning/active sprints
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

  const renderCalendarTab = () => {
    if (!board) return null;
    return <CalendarView tasks={tasks} board={board} />;
  };

  const renderOKRTab = () => {
    if (okrLoading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-7 w-7 border-2" style={{ borderColor: 'var(--color-text-tertiary)', borderTopColor: 'transparent' }} />
        </div>
      );
    }

    if (linkedObjective) {
      return (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-lg font-extrabold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              Linked Objective
            </h2>
            <div className="border-2 rounded-[var(--radius-lg)] p-5 mb-4"
              style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-bg-secondary)' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-extrabold truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {linkedObjective.objective.title}
                  </h3>
                  {linkedObjective.objective.description && (
                    <p className="text-sm font-medium mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {linkedObjective.objective.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => navigate(`/okr/${linkedObjective.objective.id}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--radius-md)] border-2 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none flex-shrink-0 ml-3"
                  style={{ backgroundColor: 'var(--color-accent-primary)', borderColor: 'var(--color-border-primary)', color: 'white' }}>
                  <ExternalLink className="h-3 w-3" /> Open
                </button>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>Progress</span>
                  <span className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                    {Math.round(linkedObjective.objective.progress * 100)}%
                  </span>
                </div>
                <div className="h-2 rounded-full border-2 overflow-hidden"
                  style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border-primary)' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.round(linkedObjective.objective.progress * 100)}%`, backgroundColor: 'var(--color-accent-primary)' }} />
                </div>
              </div>

              {/* Key Results */}
              {linkedObjective.key_results.length > 0 && (
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
                    Key Results ({linkedObjective.key_results.length})
                  </h4>
                  <div className="space-y-2">
                    {linkedObjective.key_results.map((kr) => {
                      const progress = kr.target_value > 0 ? Math.min(100, Math.round((kr.current_value / kr.target_value) * 100)) : 0;
                      return (
                        <div key={kr.id} className="px-3 py-2.5 border-2 rounded-[var(--radius-md)]"
                          style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-bg-primary)' }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                              {kr.title}
                            </span>
                            <span className="text-xs font-bold flex-shrink-0 ml-2" style={{ color: 'var(--color-text-secondary)' }}>
                              {kr.current_value}{kr.unit || ''} / {kr.target_value}{kr.unit || ''}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden"
                            style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${progress}%`, backgroundColor: progress >= 80 ? '#16A34A' : progress >= 50 ? '#CA8A04' : '#EF4444' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // No linked objective
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-[var(--radius-lg)] border-2 flex items-center justify-center"
            style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-bg-secondary)' }}>
            <Target className="h-8 w-8" style={{ color: 'var(--color-text-tertiary)' }} />
          </div>
          <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>No Linked OKR</p>
          <p className="text-sm font-medium mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            This project doesn't have an OKR linked to it yet.
          </p>
          <button
            onClick={() => navigate('/okr')}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-[var(--radius-md)] border-2 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none"
            style={{ backgroundColor: 'var(--color-accent-primary)', borderColor: 'var(--color-border-primary)', color: 'white' }}>
            <ArrowUpRight className="h-4 w-4" /> Go to OKRs
          </button>
        </div>
      </div>
    );
  };

  // ===== Empty state: no boardId selected =====
  if (!boardId) {
    return (
      <div className="flex-1 flex overflow-hidden">
        <ProjectSidebar />
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-[var(--radius-lg)] border-2 flex items-center justify-center"
              style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-bg-secondary)' }}>
              <Columns3 className="h-8 w-8" style={{ color: 'var(--color-text-tertiary)' }} />
            </div>
            <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Select a project</p>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Choose a project from the sidebar
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      <ProjectSidebar />
      <div className="flex-1 flex flex-col min-h-0" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        {/* Header with project name and tab bar */}
        <div className="flex-shrink-0 border-b-2" style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-bg-primary)' }}>
          {/* Project name + new task button */}
          <div className="flex items-center justify-between px-6 py-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
                  {board ? board.name : 'Loading...'}
                </h1>
                {board && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border"
                    style={{ borderColor: 'var(--color-border-primary)', color: 'var(--color-text-tertiary)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                    <RefreshCw className="w-4 h-4 inline" /> Sprint
                  </span>
                )}
              </div>
              {board?.description && (
                <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{board.description}</p>
              )}
            </div>
            <button onClick={openCreateModal}
              className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border-2 text-sm font-bold transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none"
              style={{ backgroundColor: 'var(--color-accent-primary)', borderColor: 'var(--color-border-primary)', color: 'white' }}>
              <Plus className="h-4 w-4" /> New Task
            </button>
          </div>

          {/* Tab bar — pill-style segmented control */}
          <div className="flex items-center gap-1 px-6 pb-3">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--radius-md)] border-2 transition-all ${
                    isActive
                      ? 'shadow-[1px_1px_0px_#0D0D0D]'
                      : 'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none'
                  }`}
                  style={{
                    backgroundColor: isActive ? 'var(--color-accent-primary)' : 'var(--color-bg-secondary)',
                    borderColor: 'var(--color-border-primary)',
                    color: isActive ? '#FFFFFF' : 'var(--color-text-secondary)',
                  }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sprint bar */}
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
        ) : error || !board ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-[var(--radius-lg)] border-2 flex items-center justify-center"
                style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-bg-secondary)' }}>
                <Columns3 className="h-8 w-8" style={{ color: 'var(--color-text-tertiary)' }} />
              </div>
              <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Project not found</p>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                {error || 'The selected project could not be loaded.'}
              </p>
            </div>
          </div>
        ) : (
          renderTabContent()
        )}

        {/* Task Modal */}
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

        {/* Sprint Modals */}
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
