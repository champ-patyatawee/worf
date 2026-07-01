import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseWikilinks, generateSlug, countWords, extractTags } from "../components/notes/noteHelpers";

// ============================================================================
// noteHelpers tests
// ============================================================================

describe("parseWikilinks", () => {
  it("parses simple [[wikilink]]", () => {
    const result = parseWikilinks("See [[Meeting Notes]] for details");
    expect(result).toEqual([{ target: "Meeting Notes", display: "Meeting Notes" }]);
  });

  it("parses [[wikilink|display text]]", () => {
    const result = parseWikilinks("See [[meeting|the meeting notes]]");
    expect(result).toEqual([{ target: "meeting", display: "the meeting notes" }]);
  });

  it("parses multiple wikilinks", () => {
    const result = parseWikilinks("[[Note A]] and [[Note B]]");
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ target: "Note A", display: "Note A" });
    expect(result[1]).toEqual({ target: "Note B", display: "Note B" });
  });

  it("ignores malformed brackets (single bracket)", () => {
    const result = parseWikilinks("This is [not a link]");
    expect(result).toEqual([]);
  });

  it("handles empty content", () => {
    expect(parseWikilinks("")).toEqual([]);
  });

  it("handles content with no wikilinks", () => {
    expect(parseWikilinks("Just plain text")).toEqual([]);
  });

  it("handles mixed brackets", () => {
    const result = parseWikilinks("[[Page Name]] and [[other|display with spaces]]");
    expect(result).toEqual([
      { target: "Page Name", display: "Page Name" },
      { target: "other", display: "display with spaces" },
    ]);
  });

  it("trims whitespace around target", () => {
    const result = parseWikilinks("[[  spaced out  ]]");
    expect(result).toEqual([{ target: "spaced out", display: "spaced out" }]);
  });

  it("parses [[Note Title]] with just letters and spaces", () => {
    const result = parseWikilinks("Check out [[Meeting Notes]]");
    expect(result).toEqual([{ target: "Meeting Notes", display: "Meeting Notes" }]);
  });

  it("parses [[Note.Title]] with dots (file-like patterns)", () => {
    const result = parseWikilinks("See [[v1.0.Release]]");
    expect(result).toEqual([{ target: "v1.0.Release", display: "v1.0.Release" }]);
  });

  it("parses [[folder/note]] patterns (path-style)", () => {
    const result = parseWikilinks("As described in [[projects/alpha/notes]]");
    expect(result).toEqual([{ target: "projects/alpha/notes", display: "projects/alpha/notes" }]);
  });

  it("parses [[folder/note|display]] with folder path and custom display", () => {
    const result = parseWikilinks("[[projects/alpha|Alpha Project Notes]]");
    expect(result).toEqual([{ target: "projects/alpha", display: "Alpha Project Notes" }]);
  });
});

describe("generateSlug", () => {
  it("generates slug from simple title", () => {
    expect(generateSlug("My Note Title")).toBe("my-note-title");
  });

  it("handles special characters", () => {
    expect(generateSlug("Hello World! @#$%")).toBe("hello-world");
  });

  it("handles empty title", () => {
    expect(generateSlug("")).toBe("");
  });

  it("handles leading/trailing whitespace", () => {
    expect(generateSlug("  Spaces  ")).toBe("spaces");
  });

  it("collapses multiple dashes", () => {
    expect(generateSlug("one   two---three")).toBe("one-two-three");
  });

  it("handles underscores as separators", () => {
    expect(generateSlug("snake_case_title")).toBe("snake-case-title");
  });
});

describe("countWords", () => {
  it("counts words in simple content", () => {
    expect(countWords("hello world")).toBe(2);
  });

  it("counts empty content", () => {
    expect(countWords("")).toBe(0);
  });

  it("counts content with only whitespace", () => {
    expect(countWords("   ")).toBe(0);
  });

  it("strips markdown heading markers from count", () => {
    // "# Heading" → "Heading" remains after stripping just the `# ` prefix
    expect(countWords("# Heading\n\nSome body text")).toBe(4);
  });

  it("counts words in multi-paragraph content", () => {
    const content = "First paragraph has five words.\n\nSecond paragraph here too.";
    expect(countWords(content)).toBe(9);
  });
});

describe("extractTags", () => {
  it("extracts #tags from content", () => {
    expect(extractTags("This is #meeting notes #project")).toEqual(["meeting", "project"]);
  });

  it("handles no tags", () => {
    expect(extractTags("Plain text without tags")).toEqual([]);
  });

  it("handles empty content", () => {
    expect(extractTags("")).toEqual([]);
  });

  it("does not count hash in middle of word", () => {
    expect(extractTags("C# is a language")).toEqual([]);
  });

  it("extracts hyphenated tags", () => {
    expect(extractTags("Tag #my-tag here")).toEqual(["my-tag"]);
  });

  it("deduplicates repeated tags", () => {
    expect(extractTags("#tag #tag #other")).toEqual(["tag", "other"]);
  });

  it("handles tag at start of content", () => {
    expect(extractTags("#meeting notes")).toEqual(["meeting"]);
  });

  it("extracts tags from content referencing folder paths (/ is not a tag char)", () => {
    // Tags stop at non-alphanumeric chars like / — this is expected behavior
    const content = "See #project/alpha for details #meeting";
    expect(extractTags(content)).toEqual(["project", "meeting"]);
  });

  it("extracts tags adjacent to folder-like bracketed content", () => {
    const content = "[[Project Folder]] #important\n#work notes here";
    expect(extractTags(content)).toEqual(["important", "work"]);
  });

  it("extracts tags with underscores (folder naming convention)", () => {
    expect(extractTags("#my_folder #archived_projects")).toEqual(["my_folder", "archived_projects"]);
  });

  it("handles mixed #tags and [[wikilinks]] without collision", () => {
    const content = "[[Meeting Notes]] #meeting and [[Project]] #project-alpha";
    expect(extractTags(content)).toEqual(["meeting", "project-alpha"]);
  });
});

// ============================================================================
// noteStore tests
// ============================================================================

import { noteStore } from "../components/notes/noteStore";
import { invoke } from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("noteStore", () => {
  const mockNote = {
    id: "1",
    title: "Test Note",
    slug: "test-note",
    content: "# Hello",
    folder_id: null,
    tags: "",
    frontmatter: "{}",
    pinned: 0,
    position: 0,
    word_count: 2,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  const mockNoteWithRelations = {
    note: mockNote,
    backlinks: [],
    outbound_links: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadNotes", () => {
    it("calls invoke list_root_notes and sets state", async () => {
      vi.mocked(invoke).mockResolvedValue([mockNote]);
      await noteStore.loadNotes();
      expect(invoke).toHaveBeenCalledWith("list_root_notes");
      expect(noteStore.state.notes).toEqual([mockNote]);
      expect(noteStore.state.loading).toBe(false);
    });

    it("handles errors gracefully without crashing", async () => {
      // Pre-set notes to verify they are preserved on error (store does not clear on failure)
      vi.mocked(invoke).mockResolvedValue([mockNote]);
      await noteStore.loadNotes();
      expect(noteStore.state.notes).toEqual([mockNote]);

      vi.mocked(invoke).mockRejectedValue(new Error("DB error"));
      await noteStore.loadNotes();
      // Store leaves existing notes intact on error
      expect(noteStore.state.notes).toEqual([mockNote]);
      expect(noteStore.state.loading).toBe(false);
    });
  });

  describe("loadNotesInFolder", () => {
    it("calls invoke list_notes_in_folder", async () => {
      vi.mocked(invoke).mockResolvedValue([mockNote]);
      await noteStore.loadNotesInFolder("folder-1");
      expect(invoke).toHaveBeenCalledWith("list_notes_in_folder", { folderId: "folder-1" });
    });
  });

  describe("loadFolders", () => {
    it("calls invoke list_folders and ensure_draft_folder, merges draft", async () => {
      const mockFolders = [
        { id: "f1", name: "Test", position: 0, created_at: "", updated_at: "" },
      ];
      const mockDraftFolder = {
        id: "draft-1",
        name: "Draft",
        position: 999,
        created_at: "",
        updated_at: "",
      };
      vi.mocked(invoke)
        .mockResolvedValueOnce(mockFolders)      // list_folders
        .mockResolvedValueOnce(mockDraftFolder);  // ensure_draft_folder

      await noteStore.loadFolders();

      expect(invoke).toHaveBeenCalledWith("list_folders");
      expect(invoke).toHaveBeenCalledWith("ensure_draft_folder");
      // Both the listed folders AND the draft folder should be in state
      expect(noteStore.state.folders).toEqual([...mockFolders, mockDraftFolder]);
    });

    it("handles ensure_draft_folder failure gracefully", async () => {
      const mockFolders = [
        { id: "f1", name: "Test", position: 0, created_at: "", updated_at: "" },
      ];
      vi.mocked(invoke)
        .mockResolvedValueOnce(mockFolders)               // list_folders
        .mockRejectedValueOnce(new Error("DB error"));     // ensure_draft_folder fails

      await noteStore.loadFolders();

      // The listed folders should still be present; draft folder is absent
      expect(noteStore.state.folders).toEqual(mockFolders);
    });
  });

  describe("openNote", () => {
    it("fetches and sets activeNote with relations", async () => {
      vi.mocked(invoke).mockResolvedValue(mockNoteWithRelations);
      await noteStore.openNote("1");
      expect(invoke).toHaveBeenCalledWith("get_note", { idOrSlug: "1" });
      expect(noteStore.state.activeNote).toEqual(mockNoteWithRelations);
      expect(noteStore.state.activeNoteId).toBe("1");
    });

    it("sets activeNote to null on error", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Not found"));
      await noteStore.openNote("bad-id");
      expect(noteStore.state.activeNote).toBeNull();
    });
  });

  describe("createNote", () => {
    it("calls invoke create_note and prepends note", async () => {
      vi.mocked(invoke).mockResolvedValue(mockNote);
      const result = await noteStore.createNote("Test Note");
      expect(invoke).toHaveBeenCalledWith("create_note", {
        title: "Test Note",
        folderId: null,
        tags: null,
      });
      expect(result).toEqual(mockNote);
      expect(noteStore.state.notes[0]).toEqual(mockNote);
    });

    it("creates note in a folder with tags", async () => {
      vi.mocked(invoke).mockResolvedValue({ ...mockNote, folder_id: "folder-1", tags: "project" });
      await noteStore.createNote("Test", "folder-1", "project");
      expect(invoke).toHaveBeenCalledWith("create_note", {
        title: "Test",
        folderId: "folder-1",
        tags: "project",
      });
    });

    it("returns null on failure", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Create failed"));
      const result = await noteStore.createNote("Fail");
      expect(result).toBeNull();
    });
  });

  describe("saveNote", () => {
    it("calls update_note with content and updates store", async () => {
      const updated = { ...mockNote, content: "Updated content" };
      vi.mocked(invoke).mockResolvedValue(updated);

      // Pre-populate notes list
      vi.mocked(invoke).mockResolvedValueOnce([mockNote]);
      await noteStore.loadNotes();

      vi.mocked(invoke).mockResolvedValue(updated);
      const result = await noteStore.saveNote("1", { content: "Updated content" });

      expect(invoke).toHaveBeenCalledWith("update_note", {
        id: "1",
        title: null,
        content: "Updated content",
        tags: null,
        frontmatter: null,
        pinned: null,
      });
      expect(result?.content).toBe("Updated content");
      expect(noteStore.state.notes[0].content).toBe("Updated content");
    });

    it("updates activeNote when it matches", async () => {
      const updated = { ...mockNote, title: "Renamed" };
      vi.mocked(invoke).mockResolvedValue(mockNoteWithRelations);
      await noteStore.openNote("1");

      vi.mocked(invoke).mockResolvedValue(updated);
      await noteStore.saveNote("1", { title: "Renamed" });
      expect(noteStore.state.activeNote?.note.title).toBe("Renamed");
    });
  });

  describe("deleteNote", () => {
    it("calls invoke and removes note from list", async () => {
      vi.mocked(invoke).mockResolvedValue([mockNote]);
      await noteStore.loadNotes();
      expect(noteStore.state.notes).toHaveLength(1);

      vi.mocked(invoke).mockResolvedValue(undefined);
      await noteStore.deleteNote("1");
      expect(invoke).toHaveBeenCalledWith("delete_note", { id: "1" });
      expect(noteStore.state.notes).toHaveLength(0);
    });

    it("clears activeNote if deleted", async () => {
      vi.mocked(invoke).mockResolvedValue(mockNoteWithRelations);
      await noteStore.openNote("1");

      vi.mocked(invoke).mockResolvedValue(undefined);
      await noteStore.deleteNote("1");
      expect(noteStore.state.activeNote).toBeNull();
      expect(noteStore.state.activeNoteId).toBeNull();
    });
  });

  describe("searchNotes", () => {
    it("calls search_notes with query", async () => {
      const mockResults = [{ id: "1", title: "Match", slug: "match", snippet: "...", tags: "" }];
      vi.mocked(invoke).mockResolvedValue(mockResults);
      const result = await noteStore.searchNotes("meeting");
      expect(invoke).toHaveBeenCalledWith("search_notes", { query: "meeting" });
      expect(noteStore.state.searchResults).toEqual(mockResults);
      expect(result).toEqual(mockResults);
    });

    it("returns empty for empty query", async () => {
      const result = await noteStore.searchNotes("");
      expect(noteStore.state.searchResults).toEqual([]);
      expect(result).toBeUndefined();
    });
  });

  describe("saveNote (meta updates)", () => {
    it("saves pinned state", async () => {
      const updated = { ...mockNote, pinned: 1 };
      vi.mocked(invoke).mockResolvedValue([mockNote]);
      await noteStore.loadNotes();

      vi.mocked(invoke).mockResolvedValue(updated);
      await noteStore.saveNote("1", { pinned: 1 });
      expect(noteStore.state.notes.find((n) => n.id === "1")?.pinned).toBe(1);
    });

    it("saves tags", async () => {
      const updated = { ...mockNote, tags: "project,meeting" };
      vi.mocked(invoke).mockResolvedValue([mockNote]);
      await noteStore.loadNotes();

      vi.mocked(invoke).mockResolvedValue(updated);
      await noteStore.saveNote("1", { tags: "project,meeting" });
      expect(noteStore.state.notes.find((n) => n.id === "1")?.tags).toBe("project,meeting");
    });
  });

  describe("togglePinNote", () => {
    it("calls toggle_pin_note and updates store", async () => {
      const updated = { ...mockNote, pinned: 1 };
      vi.mocked(invoke).mockResolvedValue([mockNote]);
      await noteStore.loadNotes();

      vi.mocked(invoke).mockResolvedValue(updated);
      await noteStore.togglePinNote("1");
      expect(invoke).toHaveBeenCalledWith("toggle_pin_note", { id: "1" });
      expect(noteStore.state.notes.find((n) => n.id === "1")?.pinned).toBe(1);
    });
  });

  describe("moveNote", () => {
    it("calls move_note and updates store", async () => {
      const moved = { ...mockNote, folder_id: "f2" };
      vi.mocked(invoke).mockResolvedValue([mockNote]);
      await noteStore.loadNotes();

      vi.mocked(invoke).mockResolvedValue(moved);
      await noteStore.moveNote("1", "f2");
      expect(invoke).toHaveBeenCalledWith("move_note", { id: "1", folderId: "f2" });
      expect(noteStore.state.notes[0].folder_id).toBe("f2");
    });

    it("moves note to root (null folder)", async () => {
      const noteInFolder = { ...mockNote, folder_id: "f1", id: "2" };
      const moved = { ...mockNote, folder_id: null, id: "2" };
      vi.mocked(invoke).mockResolvedValue([noteInFolder, mockNote]);
      await noteStore.loadNotes();
      expect(noteStore.state.notes.find((n) => n.id === "2")?.folder_id).toBe("f1");

      vi.mocked(invoke).mockResolvedValue(moved);
      await noteStore.moveNote("2", null);
      expect(invoke).toHaveBeenCalledWith("move_note", { id: "2", folderId: null });
      expect(noteStore.state.notes.find((n) => n.id === "2")?.folder_id).toBeNull();
    });

    it("does not crash on invoke failure", async () => {
      const original = { ...mockNote, folder_id: "f1" };
      vi.mocked(invoke).mockResolvedValue([original]);
      await noteStore.loadNotes();
      expect(noteStore.state.notes[0].folder_id).toBe("f1");

      vi.mocked(invoke).mockRejectedValue(new Error("Move failed"));
      await noteStore.moveNote("1", "new-folder");
      // Note should remain unchanged
      expect(noteStore.state.notes[0].folder_id).toBe("f1");
    });

    it("moveNote still works for single note (alongside moveNotes)", async () => {
      noteStore.state.notes = [mockNote];
      const moved = { ...mockNote, folder_id: "new-folder" };
      vi.mocked(invoke).mockResolvedValue(moved);
      await noteStore.moveNote(mockNote.id, "new-folder");
      expect(noteStore.state.notes[0].folder_id).toBe("new-folder");
    });
  });

  describe("moveNotes (batch)", () => {
    it("calls invoke with array of ids and target folderId", async () => {
      const ids = ["note-1", "note-2", "note-3"];
      const targetFolder = "folder-abc";
      vi.mocked(invoke).mockResolvedValue(undefined);
      await noteStore.moveNotes(ids, targetFolder);
      expect(invoke).toHaveBeenCalledWith("move_notes", {
        ids,
        folderId: targetFolder,
      });
    });

    it("passes null folderId when moving to root", async () => {
      const ids = ["note-1"];
      vi.mocked(invoke).mockResolvedValue(undefined);
      await noteStore.moveNotes(ids, null);
      expect(invoke).toHaveBeenCalledWith("move_notes", { ids, folderId: null });
    });

    it("updates folder_id for all moved notes in state", async () => {
      const notes = [
        { ...mockNote, id: "n1", folder_id: "old-folder" },
        { ...mockNote, id: "n2", folder_id: "old-folder" },
      ];
      noteStore.state.notes = notes as any;
      vi.mocked(invoke).mockResolvedValue(undefined);
      await noteStore.moveNotes(["n1", "n2"], "new-folder");
      expect(noteStore.state.notes.find((n) => n.id === "n1")?.folder_id).toBe("new-folder");
      expect(noteStore.state.notes.find((n) => n.id === "n2")?.folder_id).toBe("new-folder");
    });

    it("updates folder_id to null when moving to root", async () => {
      const notes = [
        { ...mockNote, id: "n1", folder_id: "some-folder" },
      ];
      noteStore.state.notes = notes as any;
      vi.mocked(invoke).mockResolvedValue(undefined);
      await noteStore.moveNotes(["n1"], null);
      expect(noteStore.state.notes.find((n) => n.id === "n1")?.folder_id).toBeNull();
    });

    it("handles errors gracefully without throwing", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("fail"));
      await expect(noteStore.moveNotes(["n1"], "f1")).resolves.not.toThrow();
    });

    it("preserves existing folder_id on invoke failure", async () => {
      const notes = [
        { ...mockNote, id: "n1", folder_id: "old-folder" },
      ];
      noteStore.state.notes = notes as any;
      vi.mocked(invoke).mockRejectedValue(new Error("fail"));
      await noteStore.moveNotes(["n1"], "new-folder");
      expect(noteStore.state.notes.find((n) => n.id === "n1")?.folder_id).toBe("old-folder");
    });
  });

  describe("createFolder", () => {
    const mockFolder = { id: "folder-new", name: "New Folder", position: 0, created_at: "", updated_at: "" };

    it("calls invoke create_folder and adds folder to state", async () => {
      vi.mocked(invoke).mockResolvedValue(mockFolder);
      const result = await noteStore.createFolder("New Folder");
      expect(invoke).toHaveBeenCalledWith("create_folder", { name: "New Folder" });
      expect(noteStore.state.folders).toContainEqual(mockFolder);
      expect(result).toEqual(mockFolder);
    });

    it("appends to existing folders", async () => {
      const existingFolders = [{ id: "f1", name: "Existing", position: 0, created_at: "", updated_at: "" }];
      noteStore.state.folders = [...existingFolders];

      const newFolder = { ...mockFolder, id: "f2", position: 1 };
      vi.mocked(invoke).mockResolvedValue(newFolder);
      await noteStore.createFolder("Another Folder");
      expect(noteStore.state.folders).toHaveLength(2);
      expect(noteStore.state.folders[1]).toEqual(newFolder);
    });

    it("returns null on failure", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Create failed"));
      const result = await noteStore.createFolder("Fail");
      expect(result).toBeNull();
    });
  });

  describe("renameFolder", () => {
    const existingFolder = { id: "f1", name: "Old Name", position: 0, created_at: "", updated_at: "" };
    const updatedFolder = { id: "f1", name: "Renamed", position: 0, created_at: "", updated_at: "" };

    it("calls invoke rename_folder and updates folder in state", async () => {
      noteStore.state.folders = [existingFolder];
      vi.mocked(invoke).mockResolvedValue(updatedFolder);
      const result = await noteStore.renameFolder("f1", "Renamed");
      expect(invoke).toHaveBeenCalledWith("rename_folder", { id: "f1", name: "Renamed" });
      expect(noteStore.state.folders[0].name).toBe("Renamed");
      expect(result).toEqual(updatedFolder);
    });

    it("returns null on failure", async () => {
      noteStore.state.folders = [existingFolder];
      vi.mocked(invoke).mockRejectedValue(new Error("Rename failed"));
      const result = await noteStore.renameFolder("f1", "New Name");
      expect(result).toBeNull();
      // Folder name should remain unchanged
      expect(noteStore.state.folders[0].name).toBe("Old Name");
    });
  });

  describe("deleteFolder", () => {
    const folders = [
      { id: "f1", name: "Folder 1", position: 0, created_at: "", updated_at: "" },
      { id: "f2", name: "Folder 2", position: 1, created_at: "", updated_at: "" },
    ];

    it("calls invoke delete_folder and removes folder from state", async () => {
      noteStore.state.folders = [...folders];
      vi.mocked(invoke).mockResolvedValue(undefined);
      await noteStore.deleteFolder("f1");
      expect(invoke).toHaveBeenCalledWith("delete_folder", { id: "f1" });
      expect(noteStore.state.folders).toHaveLength(1);
      expect(noteStore.state.folders[0].id).toBe("f2");
    });

    it("does not crash on invoke failure", async () => {
      noteStore.state.folders = [...folders];
      vi.mocked(invoke).mockRejectedValue(new Error("Delete failed"));
      await noteStore.deleteFolder("f1");
      // All folders should remain intact
      expect(noteStore.state.folders).toHaveLength(2);
    });
  });

  describe("reorderNotes", () => {
    it("calls invoke reorder_notes and updates positions in state", async () => {
      const noteA = { ...mockNote, id: "a", title: "Note A", position: 0 };
      const noteB = { ...mockNote, id: "b", title: "Note B", position: 1 };
      const noteC = { ...mockNote, id: "c", title: "Note C", position: 2 };
      noteStore.state.notes = [noteA, noteB, noteC];

      vi.mocked(invoke).mockResolvedValue(undefined);
      await noteStore.reorderNotes([
        { id: "a", position: 2 },
        { id: "b", position: 1 },
        { id: "c", position: 0 },
      ]);

      expect(invoke).toHaveBeenCalledWith("reorder_notes", {
        items: [
          { id: "a", position: 2 },
          { id: "b", position: 1 },
          { id: "c", position: 0 },
        ],
      });
      expect(noteStore.state.notes.find((n) => n.id === "a")?.position).toBe(2);
      expect(noteStore.state.notes.find((n) => n.id === "b")?.position).toBe(1);
      expect(noteStore.state.notes.find((n) => n.id === "c")?.position).toBe(0);
    });

    it("does not crash on invoke failure", async () => {
      noteStore.state.notes = [{ ...mockNote, position: 0 }];
      vi.mocked(invoke).mockRejectedValue(new Error("Reorder failed"));
      await noteStore.reorderNotes([{ id: "1", position: 5 }]);
      // Position should remain unchanged
      expect(noteStore.state.notes[0].position).toBe(0);
    });
  });

  describe("reorderFolders", () => {
    const folderA = { id: "a", name: "Alpha", position: 0, created_at: "", updated_at: "" };
    const folderB = { id: "b", name: "Beta", position: 1, created_at: "", updated_at: "" };
    const folderC = { id: "c", name: "Gamma", position: 2, created_at: "", updated_at: "" };

    it("calls invoke reorder_folders and updates positions in state", async () => {
      noteStore.state.folders = [folderA, folderB, folderC];

      vi.mocked(invoke).mockResolvedValue(undefined);
      await noteStore.reorderFolders([
        { id: "c", position: 0 },
        { id: "b", position: 1 },
        { id: "a", position: 2 },
      ]);

      expect(invoke).toHaveBeenCalledWith("reorder_folders", {
        items: [
          { id: "c", position: 0 },
          { id: "b", position: 1 },
          { id: "a", position: 2 },
        ],
      });
      expect(noteStore.state.folders.find((f) => f.id === "a")?.position).toBe(2);
      expect(noteStore.state.folders.find((f) => f.id === "b")?.position).toBe(1);
      expect(noteStore.state.folders.find((f) => f.id === "c")?.position).toBe(0);
    });

    it("does not crash on invoke failure", async () => {
      noteStore.state.folders = [folderA];
      vi.mocked(invoke).mockRejectedValue(new Error("Reorder folders failed"));
      await noteStore.reorderFolders([{ id: "a", position: 99 }]);
      expect(noteStore.state.folders[0].position).toBe(0);
    });
  });

  describe("loadAllNotes", () => {
    it("calls list_notes and sets state", async () => {
      vi.mocked(invoke).mockResolvedValue([mockNote]);
      await noteStore.loadAllNotes();
      expect(invoke).toHaveBeenCalledWith("list_notes");
      expect(noteStore.state.notes).toEqual([mockNote]);
    });
  });

  describe("loadNotesByTag", () => {
    it("calls list_notes with tag", async () => {
      vi.mocked(invoke).mockResolvedValue([mockNote]);
      await noteStore.loadNotesByTag("meeting");
      expect(invoke).toHaveBeenCalledWith("list_notes", { tag: "meeting" });
    });
  });
});

// ============================================================================
// NoteEditor-integrating tests (high-level pure function checks)
// ============================================================================

describe("NoteEditor (high-level)", () => {
  it("parseWikilinks integration with full content", () => {
    const content = `# Meeting Notes

See [[Project Alpha]] for the roadmap.

Also check [[notes|the detailed notes]] on this topic.

#tags meeting`;
    const links = parseWikilinks(content);
    expect(links).toHaveLength(2);
    expect(links[0]).toEqual({ target: "Project Alpha", display: "Project Alpha" });
    expect(links[1]).toEqual({ target: "notes", display: "the detailed notes" });
  });

  it("generateSlug creates unique slugs from titles", () => {
    const titles = ["My Great Note", "Hello World!", "  Leading Spaces  ", "already-kebab"];
    const expected = ["my-great-note", "hello-world", "leading-spaces", "already-kebab"];
    titles.forEach((t, i) => {
      expect(generateSlug(t)).toBe(expected[i]);
    });
  });

  it("extractTags works with real note content", () => {
    const content = `# Project Plan
This is about #project-management and #agile.
Also related: #devops #ci-cd`;
    const tags = extractTags(content);
    expect(tags).toContain("project-management");
    expect(tags).toContain("agile");
    expect(tags).toContain("devops");
    expect(tags).toContain("ci-cd");
    expect(tags).toHaveLength(4);
  });

  it("countWords correctly counts editor content", () => {
    const content = "# Heading\n\nBody text here with several words.\n\n- List item\n- Another item\n\nFinal paragraph.";
    // After stripping # headings: "Body text here with several words.\n\n- List item\n- Another item\n\nFinal paragraph."
    // Words: Body, text, here, with, several, words., -, List, item, -, Another, item, Final, paragraph. = 14
    expect(countWords(content)).toBe(15);
  });

  it("empty note has zero word count", () => {
    expect(countWords("")).toBe(0);
  });
});