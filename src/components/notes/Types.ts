export interface Note {
  id: string;
  title: string;
  slug: string;
  content: string;
  folder_id: string | null;
  tags: string;
  frontmatter: string;
  pinned: number;
  position: number;
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

export interface Folder {
  id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export type EditorMode = "edit" | "preview" | "split";