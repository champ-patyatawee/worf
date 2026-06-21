import { invoke } from "@tauri-apps/api/core";
import type { Note, NoteWithRelations, Folder, SearchResult, GraphData } from "./Types";

// ── Types ──

export interface NoteState {
  notes: Note[];
  folders: Folder[];
  activeNoteId: string | null;
  activeNote: NoteWithRelations | null;
  loading: boolean;
  searchResults: SearchResult[];
  graphData: GraphData | null;
  tags: string[];
  sidebarRefreshKey: number;
}

// ── Store state ──

type Listener = () => void;
const listeners = new Set<Listener>();

let state: NoteState = {
  notes: [],
  folders: [],
  activeNoteId: null,
  activeNote: null,
  loading: false,
  searchResults: [],
  graphData: null,
  tags: [],
  sidebarRefreshKey: 0,
};

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function getSnapshot() {
  return {};
}

// ── Helpers ──

function aggregateTags(notes: Note[]): string[] {
  const tagSet = new Set<string>();
  for (const note of notes) {
    if (note.tags) {
      for (const tag of note.tags.split(",")) {
        const t = tag.trim();
        if (t) tagSet.add(t);
      }
    }
  }
  return Array.from(tagSet).sort();
}

// ── Sidebar refresh trigger ──

export function triggerSidebarRefresh() {
  state.sidebarRefreshKey++;
  emit();
}

// ── Store ──

export const noteStore = {
  subscribe,
  getSnapshot,

  get state() {
    return state;
  },

  // ── Actions ──

  async loadNotes() {
    state.loading = true;
    emit();
    try {
      const notes = await invoke<Note[]>("list_root_notes");
      state.notes = notes;
      state.tags = aggregateTags(notes);
    } catch (e: any) {
      console.error("Failed to load notes:", e);
    }
    state.loading = false;
    emit();
  },

  async loadNotesInFolder(folderId: string) {
    state.loading = true;
    emit();
    try {
      const notes = await invoke<Note[]>("list_notes_in_folder", { folderId });
      state.notes = notes;
      state.tags = aggregateTags(notes);
    } catch (e: any) {
      console.error("Failed to load notes in folder:", e);
    }
    state.loading = false;
    emit();
  },

  async loadFolders() {
    try {
      const folders = await invoke<Folder[]>("list_folders");
      state.folders = folders;
      emit();
    } catch (e: any) {
      console.error("Failed to load folders:", e);
    }
  },

  async openNote(idOrSlug: string) {
    state.loading = true;
    state.activeNoteId = idOrSlug;
    emit();
    try {
      const result = await invoke<NoteWithRelations>("get_note", { idOrSlug });
      state.activeNote = result;
      state.activeNoteId = result.note.id;
    } catch (e: any) {
      console.error("Failed to open note:", e);
      state.activeNote = null;
    }
    state.loading = false;
    emit();
  },

  async createNote(title?: string, folderId?: string | null, tags?: string) {
    try {
      const note = await invoke<Note>("create_note", {
        title: title || null,
        folderId: folderId || null,
        tags: tags || null,
      });
      state.notes = [note, ...state.notes];
      state.tags = aggregateTags(state.notes);
      state.activeNoteId = note.id;
      state.activeNote = { note, backlinks: [], outbound_links: [] };
      emit();
      triggerSidebarRefresh();
      return note;
    } catch (e: any) {
      console.error("Failed to create note:", e);
      return null;
    }
  },

  async saveNote(
    id: string,
    updates: Partial<Pick<Note, "title" | "content" | "tags" | "frontmatter" | "pinned">>
  ) {
    try {
      const updated = await invoke<Note>("update_note", {
        id,
        title: updates.title ?? null,
        content: updates.content ?? null,
        tags: updates.tags ?? null,
        frontmatter: updates.frontmatter ?? null,
        pinned: updates.pinned ?? null,
      });
      // Update notes list
      state.notes = state.notes.map((n) => (n.id === id ? updated : n));
      // Update active note if it's the same
      if (state.activeNote && state.activeNote.note.id === id) {
        state.activeNote = {
          ...state.activeNote,
          note: updated,
        };
      }
      state.tags = aggregateTags(state.notes);
      emit();
      triggerSidebarRefresh();
      return updated;
    } catch (e: any) {
      console.error("Failed to save note:", e);
      return null;
    }
  },

  async deleteNote(id: string) {
    try {
      await invoke("delete_note", { id });
      state.notes = state.notes.filter((n) => n.id !== id);
      state.tags = aggregateTags(state.notes);
      if (state.activeNoteId === id) {
        state.activeNote = null;
        state.activeNoteId = null;
      }
      emit();
      triggerSidebarRefresh();
    } catch (e: any) {
      console.error("Failed to delete note:", e);
    }
  },

  async moveNote(id: string, folderId: string | null) {
    try {
      const moved = await invoke<Note>("move_note", { id, folderId });
      state.notes = state.notes.map((n) => (n.id === id ? moved : n));
      emit();
      triggerSidebarRefresh();
    } catch (e: any) {
      console.error("Failed to move note:", e);
    }
  },

  async searchNotes(query: string) {
    if (!query.trim()) {
      state.searchResults = [];
      emit();
      return;
    }
    try {
      const results = await invoke<SearchResult[]>("search_notes", { query });
      state.searchResults = results;
      emit();
      return results;
    } catch (e: any) {
      console.error("Failed to search notes:", e);
      state.searchResults = [];
      emit();
      return [];
    }
  },

  async loadGraphData() {
    try {
      const data = await invoke<GraphData>("get_graph_data");
      state.graphData = data;
      emit();
      return data;
    } catch (e: any) {
      console.error("Failed to load graph data:", e);
      return null;
    }
  },

  async togglePinNote(id: string) {
    try {
      const updated = await invoke<Note>("toggle_pin_note", { id });
      state.notes = state.notes.map((n) => (n.id === id ? updated : n));
      if (state.activeNote && state.activeNote.note.id === id) {
        state.activeNote = { ...state.activeNote, note: updated };
      }
      emit();
      triggerSidebarRefresh();
      return updated;
    } catch (e: any) {
      console.error("Failed to toggle pin:", e);
      return null;
    }
  },

  async createFolder(name: string) {
    try {
      const folder = await invoke<Folder>("create_folder", { name });
      state.folders = [...state.folders, folder];
      emit();
      return folder;
    } catch (e: any) {
      console.error("Failed to create folder:", e);
      return null;
    }
  },

  async renameFolder(id: string, name: string) {
    try {
      const updated = await invoke<Folder>("rename_folder", { id, name });
      state.folders = state.folders.map((f) => (f.id === id ? updated : f));
      emit();
      return updated;
    } catch (e: any) {
      console.error("Failed to rename folder:", e);
      return null;
    }
  },

  async deleteFolder(id: string) {
    try {
      await invoke("delete_folder", { id });
      state.folders = state.folders.filter((f) => f.id !== id);
      emit();
      triggerSidebarRefresh();
    } catch (e: any) {
      console.error("Failed to delete folder:", e);
    }
  },

  async reorderNotes(items: { id: string; position: number }[]) {
    try {
      await invoke("reorder_notes", { items });
      for (const item of items) {
        state.notes = state.notes.map((n) =>
          n.id === item.id ? { ...n, position: item.position } : n
        );
      }
      emit();
    } catch (e: any) {
      console.error("Failed to reorder notes:", e);
    }
  },

  async reorderFolders(items: { id: string; position: number }[]) {
    try {
      await invoke("reorder_folders", { items });
      for (const item of items) {
        state.folders = state.folders.map((f) =>
          f.id === item.id ? { ...f, position: item.position } : f
        );
      }
      emit();
    } catch (e: any) {
      console.error("Failed to reorder folders:", e);
    }
  },

  async loadAllNotes() {
    state.loading = true;
    emit();
    try {
      const notes = await invoke<Note[]>("list_notes");
      state.notes = notes;
      state.tags = aggregateTags(notes);
    } catch (e: any) {
      console.error("Failed to load all notes:", e);
    }
    state.loading = false;
    emit();
  },

  async loadNotesByTag(tag: string) {
    state.loading = true;
    emit();
    try {
      const notes = await invoke<Note[]>("list_notes", { tag });
      state.notes = notes;
    } catch (e: any) {
      console.error("Failed to load notes by tag:", e);
    }
    state.loading = false;
    emit();
  },
};