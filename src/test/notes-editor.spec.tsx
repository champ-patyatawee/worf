// ═══════════════════════════════════════════════════════════════════════════════
// NoteEditor — Content Sync & Typing Regression Tests
// ═══════════════════════════════════════════════════════════════════════════════
//
// Bugs under test:
//   Bug 1 — "Double typing": When auto-save completes, noteStore.saveNote()
//            updates state.activeNote.note.content with the server response.
//            The sync useEffect then calls setContent(...), OVERWRITING any
//            content the user typed between save-initiation and save-completion.
//
//   Bug 2 — "Cursor jumps to end": Same root cause — the useEffect depends on
//            st.activeNote?.note?.updated_at, which changes on every save,
//            causing setContent to re-run and reset the cursor.
//
// Fix (applied by @frontend before these tests run):
//   1. Change useEffect dependency [..., updated_at] → [id] only
//   2. In noteStore.saveNote(), don't overwrite activeNote.note.content
//
// These tests verify the CORRECT (post-fix) behavior.
//
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, act } from "@testing-library/react";
import React from "react";

// ── Hoisted shared state for mocks ──────────────────────────────────────────
// (vi.hoisted runs before all vi.mock factories, so these vars are available)

const mockNavigate = vi.hoisted(() => vi.fn());

/** Mutable snapshot of the store that the mocked noteStore getter returns. */
const mockStoreState = vi.hoisted(
  () =>
    ({
      notes: [],
      folders: [],
      activeNoteId: null,
      activeNote: null,
      loading: false,
      searchResults: [],
      tags: [],
      sidebarRefreshKey: 0,
    }) as any
);

/** Listeners registered via noteStore.subscribe(). */
const storeListeners = vi.hoisted(() => new Set<() => void>());

/** Saved reference to invoke (Tauri) mock so tests can configure it. */
const mockInvoke = vi.hoisted(() => vi.fn());

// ── Module mocks ────────────────────────────────────────────────────────────

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockInvoke,
}));

vi.mock("../components/notes/noteStore", () => ({
  noteStore: {
    subscribe: (l: () => void) => {
      storeListeners.add(l);
      return () => {
        storeListeners.delete(l);
      };
    },
    getSnapshot: () => ({}),
    get state() {
      return mockStoreState;
    },
    saveNote: vi.fn(),
    loadNotes: vi.fn(),
    loadFolders: vi.fn(),
    openNote: vi.fn(),
    createNote: vi.fn(),
    deleteNote: vi.fn(),
    togglePinNote: vi.fn(),
    searchNotes: vi.fn(),
    loadNotesInFolder: vi.fn(),
    moveNote: vi.fn(),
    moveNotes: vi.fn(),
    reorderNotes: vi.fn(),
    reorderFolders: vi.fn(),
    createFolder: vi.fn(),
    renameFolder: vi.fn(),
    deleteFolder: vi.fn(),
    loadAllNotes: vi.fn(),
    loadNotesByTag: vi.fn(),
  },
  triggerSidebarRefresh: vi.fn(),
}));

// Mock child components so they don't pull in heavy dependencies
vi.mock("../components/notes/NoteToolbar", () => ({
  NoteToolbar: () => <div data-testid="note-toolbar" />,
}));
vi.mock("../components/notes/EditBar", () => ({
  EditBar: () => <div data-testid="edit-bar" />,
}));
vi.mock("../components/notes/LocalImage", () => ({
  LocalImage: () => <div data-testid="local-image" />,
}));
vi.mock("../components/notes/BacklinksPanel", () => ({
  BacklinksPanel: () => <div data-testid="backlinks-panel" />,
}));
vi.mock("../components/notes/WikilinkAutocomplete", () => ({
  WikilinkAutocomplete: () => <div data-testid="wikilink-autocomplete" />,
}));

// Mock Tauri plugins used by EditBar / NoteEditor
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));
vi.mock("@tauri-apps/plugin-fs", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));
vi.mock("@tauri-apps/api/path", () => ({
  appDataDir: vi.fn().mockResolvedValue("/mock/app/dir"),
}));

// Mock mermaid and highlight.js so they don't fail in jsdom
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: "<svg></svg>" }),
  },
}));
vi.mock("highlight.js", () => ({
  default: {
    getLanguage: vi.fn(),
    highlight: vi.fn(),
  },
}));

// ── Imports (these use the mocked modules) ──────────────────────────────────

import { NoteEditor } from "../components/notes/NoteEditor";

// ── Helpers ─────────────────────────────────────────────────────────────────

const BASE_NOTE = {
  id: "note-1",
  title: "Test Note",
  slug: "test-note",
  content: "Original content for testing.",
  folder_id: null,
  tags: "",
  frontmatter: "{}",
  pinned: 0,
  position: 0,
  word_count: 4,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

function makeActiveNote(
  overrides: Partial<typeof BASE_NOTE> = {}
) {
  return {
    note: { ...BASE_NOTE, ...overrides },
    backlinks: [],
    outbound_links: [],
  };
}

function getTextarea() {
  return screen.getByPlaceholderText(/Start writing/) as HTMLTextAreaElement;
}

/** Trigger a re-render by calling the store's subscription listeners. */
function emitStore() {
  storeListeners.forEach((l) => l());
}

beforeEach(() => {
  vi.clearAllMocks();
  // Reset store state to defaults
  Object.assign(mockStoreState, {
    notes: [],
    folders: [],
    activeNoteId: null,
    activeNote: null,
    loading: false,
    searchResults: [],
    tags: [],
    sidebarRefreshKey: 0,
  });
});

afterEach(() => {
  cleanup();
});

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe("NoteEditor – content sync behavior", () => {
  // ── Initial render ───────────────────────────────────────────────────────

  it("renders empty state when no active note exists", () => {
    render(<NoteEditor />);
    expect(screen.getByText("Select a note")).toBeTruthy();
  });

  it("syncs content from store on initial mount", async () => {
    mockStoreState.activeNote = makeActiveNote({ content: "Hello world" });

    render(<NoteEditor />);

    await waitFor(() => {
      expect(getTextarea()).toHaveValue("Hello world");
    });
  });

  // ── Bug 1 regression: content overwrite on save ──────────────────────────

  it("preserves local content when updated_at changes after save (same note)", async () => {
    // Set up a note in the store
    mockStoreState.activeNote = makeActiveNote({
      content: "Original",
      updated_at: "t1",
    });

    const { rerender } = render(<NoteEditor />);

    // Wait for the sync effect to populate the textarea
    await waitFor(() => {
      expect(getTextarea()).toHaveValue("Original");
    });

    // ── USER TYPES new content ──
    fireEvent.change(getTextarea(), { target: { value: "User edit in progress" } });
    expect(getTextarea()).toHaveValue("User edit in progress");

    // ── SAVE COMPLETES ──
    // The store updates activeNote with the SERVER RESPONSE:
    //   - updated_at changes (new timestamp from server)
    //   - content is set to what was saved (stale – does not include latest user edit)
    mockStoreState.activeNote = makeActiveNote({
      content: "Original", // <-- stale server response
      updated_at: "t2",    // <-- new timestamp triggers useEffect (in buggy code)
    });

    // Simulate the store emit that triggers the component's subscription callback
    act(() => {
      emitStore();
    });

    // Force a re-render so the component body re-reads noteStore.state
    rerender(<NoteEditor />);

    // ── ASSERT ──
    // The user's latest edit must survive. If the effect re-ran due to
    // updated_at changing, it would set content to "Original", which is WRONG.
    await waitFor(() => {
      expect(getTextarea()).toHaveValue("User edit in progress");
    });
  });

  // ── Normal note switch (id changes) ──────────────────────────────────────

  it("updates content when switching to a different note", async () => {
    mockStoreState.activeNote = makeActiveNote({
      id: "note-1",
      content: "Note one content",
      updated_at: "t1",
    });

    const { rerender } = render(<NoteEditor />);

    await waitFor(() => {
      expect(getTextarea()).toHaveValue("Note one content");
    });

    // ── SWITCH TO NOTE 2 ──
    mockStoreState.activeNote = makeActiveNote({
      id: "note-2",
      title: "Second Note",
      content: "Note two content",
      updated_at: "t2",
    });

    act(() => {
      emitStore();
    });
    rerender(<NoteEditor />);

    await waitFor(() => {
      expect(getTextarea()).toHaveValue("Note two content");
    });
  });

  // ── Auto-save race condition ─────────────────────────────────────────────

  it("preserves user edits made during an in-flight auto-save", async () => {
    // Simulates this timeline:
    //   1. User types "Hello"
    //   2. Auto-save fires (calls noteStore.saveNote with "Hello")
    //   3. Before save completes, user types " World"
    //   4. Save completes — server returns "Hello" (stale)
    //   5. Store updates activeNote with stale content + new updated_at
    //   6. Editor must still show "Hello World"

    mockStoreState.activeNote = makeActiveNote({
      content: "Start",
      updated_at: "t1",
    });

    const { rerender } = render(<NoteEditor />);

    await waitFor(() => {
      expect(getTextarea()).toHaveValue("Start");
    });

    // User types first batch (triggers auto-save)
    fireEvent.change(getTextarea(), { target: { value: "Hello" } });
    expect(getTextarea()).toHaveValue("Hello");

    // Before the debounced save resolves, user types more
    fireEvent.change(getTextarea(), { target: { value: "Hello World" } });
    expect(getTextarea()).toHaveValue("Hello World");

    // Save completes: server returns only "Hello" (stale) + new updated_at
    mockStoreState.activeNote = makeActiveNote({
      content: "Hello", // stale — doesn't include " World"
      updated_at: "t2",
    });

    act(() => {
      emitStore();
    });
    rerender(<NoteEditor />);

    // The editor must preserve the latest user content.
    await waitFor(() => {
      expect(getTextarea()).toHaveValue("Hello World");
    });
  });

  // ── Tag sync behavior (same pattern as content) ──────────────────────────

  it("preserves tags when updated_at changes after save", async () => {
    mockStoreState.activeNote = makeActiveNote({
      tags: "original,tags",
      updated_at: "t1",
    });

    const { rerender } = render(<NoteEditor />);

    // The component renders tags from noteStore.tags — but it actually
    // reads `active.note.tags` in the sync useEffect and splits by comma.
    // Tags are shown as inline spans. Verify initial render.
    await waitFor(() => {
      expect(screen.getByText("#original")).toBeTruthy();
      expect(screen.getByText("#tags")).toBeTruthy();
    });

    // Simulate a note save that changes updated_at but keeps tags the same
    mockStoreState.activeNote = makeActiveNote({
      tags: "original,tags",
      updated_at: "t2",
    });

    act(() => {
      emitStore();
    });
    rerender(<NoteEditor />);

    // Tags should still be visible
    await waitFor(() => {
      expect(screen.getByText("#original")).toBeTruthy();
      expect(screen.getByText("#tags")).toBeTruthy();
    });
  });

  // ── Title sync behavior (same pattern) ───────────────────────────────────

  it("preserves title edits when updated_at changes after save", async () => {
    mockStoreState.activeNote = makeActiveNote({
      title: "Original Title",
      updated_at: "t1",
    });

    const { rerender } = render(<NoteEditor />);

    const titleInput = screen.getByDisplayValue("Original Title") as HTMLInputElement;

    // User edits the title
    fireEvent.change(titleInput, { target: { value: "Edited Title" } });
    expect(titleInput).toHaveValue("Edited Title");

    // Save completes: updated_at changes
    mockStoreState.activeNote = makeActiveNote({
      title: "Original Title", // server returns the saved title (might be stale)
      content: "Original content for testing.",
      updated_at: "t2",
    });

    act(() => {
      emitStore();
    });
    rerender(<NoteEditor />);

    // Edited title should survive
    await waitFor(() => {
      expect(screen.getByDisplayValue("Edited Title")).toBeTruthy();
    });
  });

  // ── Note cleared (activeNote becomes null) ───────────────────────────────

  it("shows select-a-note when activeNote is cleared", async () => {
    mockStoreState.activeNote = makeActiveNote({ content: "Something" });

    const { rerender } = render(<NoteEditor />);

    await waitFor(() => {
      expect(getTextarea()).toHaveValue("Something");
    });

    // Clear the active note
    mockStoreState.activeNote = null;

    act(() => {
      emitStore();
    });
    rerender(<NoteEditor />);

    await waitFor(() => {
      expect(screen.getByText("Select a note")).toBeTruthy();
    });
  });
});
