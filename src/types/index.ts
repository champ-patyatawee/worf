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
