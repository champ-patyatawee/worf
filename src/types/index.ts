// Notes
export interface Folder {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  content: string;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

// Kanban
export interface Board {
  id: string;
  name: string;
  slug: string;
  description: string | null;
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
  created_at: string;
  updated_at: string;
}

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";
