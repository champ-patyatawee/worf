// Kanban
export interface Board {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  board_type: string;   // "kanban" | "sprint"
  created_at: string;
  updated_at: string;
}

export interface BoardWithTasks extends Board {
  tasks: Task[];
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  position: number;
  board_id: string;
  sprint_id: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

// Sprint
export interface Sprint {
  id: string;
  board_id: string;
  name: string;
  goal: string | null;
  start_date: string;
  end_date: string;
  status: 'planning' | 'active' | 'complete';
  created_at: string;
  updated_at: string;
}

export interface SprintCompleteSummary {
  sprint: Sprint;
  total_tasks: number;
  completed_tasks: number;
  moved_to_backlog: number;
}

// Notes - New types
export interface Note {
  id: string;
  title: string;
  slug: string;
  content: string;
  folder_id: string | null;
  tags: string;
  frontmatter: string;
  pinned: number;
  word_count: number;
  created_at: string;
  updated_at: string;
}

export interface NoteWithRelations {
  note: Note;
  backlinks: LinkInfo[];
  outbound_links: LinkInfo[];
}

export interface LinkInfo {
  note_id: string;
  note_title: string;
  note_slug: string;
  link_text: string;
}

export interface SearchResult {
  id: string;
  title: string;
  slug: string;
  snippet: string;
  tags: string;
}

export interface NoteLink {
  id: string;
  source_id: string;
  target_id: string;
  link_text: string;
  created_at: string;
}

export type EditorMode = "edit" | "preview" | "split";

// OKRs
export interface Objective {
  id: string;
  title: string;
  description: string | null;
  quarter: string;       // "2026-Q2"
  year: number;
  progress: number;      // 0.0 - 1.0
  created_at: string;
  updated_at: string;
}

export interface KeyResult {
  id: string;
  objective_id: string;
  title: string;
  initial_value: number;
  target_value: number;
  current_value: number;
  unit: string | null;   // "%", "count", etc.
  confidence: number | null;  // 1-10
  created_at: string;
  updated_at: string;
}

export interface ObjectiveWithKRs {
  objective: Objective;
  key_results: KeyResult[];
  board_ids: string[];
}
