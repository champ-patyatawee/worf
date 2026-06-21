import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Pin,
  Folder,
  Tag,
  Plus,
  FileText,
  MoreHorizontal,
  Trash2,
  Pencil,
  ChevronRight,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { noteStore, triggerSidebarRefresh } from "./noteStore";
import type { Note, Folder as FolderType } from "./Types";

// ── Drag data helpers ──

type DragPayload =
  | { type: "note"; id: string; folderId: string | null; position: number }
  | { type: "folder"; id: string; position: number };

export function NoteSidebar() {
  const navigate = useNavigate();
  const [, forceUpdate] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const activeFolderIdRef = useRef<string | null>(null);
  const [folderContextMenu, setFolderContextMenu] = useState<{
    folder: FolderType;
    x: number;
    y: number;
  } | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [unfiledExpanded, setUnfiledExpanded] = useState(true);
  const draggedItemRef = useRef<DragPayload | null>(null);

  const st = noteStore.state;

  useEffect(() => {
    const unsub = noteStore.subscribe(() => forceUpdate((n) => n + 1));
    noteStore.loadFolders();
    noteStore.loadNotes();
    return () => unsub();
  }, []);

  // Refresh when sidebarRefreshKey changes (triggered from editor)
  // Preserve current view — if a folder is active, reload its notes instead of root notes
  useEffect(() => {
    const key = st.sidebarRefreshKey;
    if (activeFolderIdRef.current) {
      noteStore.loadAllNotes();
    } else {
      noteStore.loadNotes();
    }
    noteStore.loadFolders();
  }, [st.sidebarRefreshKey]);  // Ref is always current; state not needed

  // Handle Cmd+P for quick switcher
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "p" || e.key === "k")) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("open-quick-switcher"));
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handleNoteClick = useCallback(
    (slug: string) => {
      navigate(`/notes/${slug}`);
    },
    [navigate]
  );

  // handleCreateNote is now inlined directly in the button onClick below

  const handleCreateFolder = useCallback(() => {
    setCreatingFolder(true);
  }, []);

  const handleFolderClick = useCallback(
    (folderId: string) => {
      const expanded = expandedFolders.has(folderId);
      if (expanded) {
        // Collapsing — just fold the UI, don't reload
        setExpandedFolders((prev) => {
          const next = new Set(prev);
          next.delete(folderId);
          return next;
        });
        setActiveFolderId(null);
        activeFolderIdRef.current = null;
      } else {
        // Expanding
        setExpandedFolders((prev) => {
          const next = new Set(prev);
          next.add(folderId);
          return next;
        });
        setActiveFolderId(folderId);
        activeFolderIdRef.current = folderId;
        noteStore.loadAllNotes();
      }
    },
    [expandedFolders]
  );

  const handleTagClick = useCallback((tag: string) => {
    noteStore.loadNotesByTag(tag);
  }, []);

  const handleFolderContextMenu = useCallback(
    (e: React.MouseEvent, folder: FolderType) => {
      e.preventDefault();
      setFolderContextMenu({ folder, x: e.clientX, y: e.clientY });
    },
    []
  );

  const handleDeleteFolder = useCallback(async (folder: FolderType) => {
    setFolderContextMenu(null);
    if (confirm(`Delete folder "${folder.name}"? Notes in this folder will be unorganized.`)) {
      await noteStore.deleteFolder(folder.id);
      noteStore.loadNotes();
    }
  }, []);

  const handleRenameFolder = useCallback((folder: FolderType) => {
    setFolderContextMenu(null);
    setRenamingFolder(folder.id);
    setRenameValue(folder.name);
  }, []);

  const handleRenameSubmit = useCallback(
    async (folderId: string) => {
      if (renameValue.trim()) {
        await noteStore.renameFolder(folderId, renameValue.trim());
      }
      setRenamingFolder(null);
    },
    [renameValue]
  );

  // ── Reorder logic ──

  const handleReorderNotesInFolder = useCallback(
    (folderId: string, noteId: string, e: React.DragEvent) => {
      const targetEl = (e.target as HTMLElement).closest("[data-note-id]");
      if (!targetEl) return;
      const targetId = targetEl.getAttribute("data-note-id");
      if (!targetId || targetId === noteId) return;

      const folderNotesList = st.notes
        .filter((n) => n.folder_id === folderId && n.pinned !== 1)
        .sort((a, b) => a.position - b.position);

      const draggedIdx = folderNotesList.findIndex((n) => n.id === noteId);
      const targetIdx = folderNotesList.findIndex((n) => n.id === targetId);
      if (draggedIdx === -1 || targetIdx === -1) return;

      const reordered = [...folderNotesList];
      const [moved] = reordered.splice(draggedIdx, 1);
      reordered.splice(targetIdx, 0, moved);

      const items = reordered.map((n, i) => ({ id: n.id, position: i }));
      noteStore.reorderNotes(items);
    },
    [st.notes]
  );

  // ── Note drag handlers ──

  const handleNoteDragStart = useCallback(
    (e: React.DragEvent, note: Note) => {
      const payload: DragPayload = {
        type: "note",
        id: note.id,
        folderId: note.folder_id,
        position: note.position,
      };
      draggedItemRef.current = payload;
      e.dataTransfer.setData("text/plain", JSON.stringify(payload));
      e.dataTransfer.effectAllowed = "move";
      (e.currentTarget as HTMLElement).style.opacity = "0.4";
    },
    []
  );

  const handleNoteDragEnd = useCallback((e: React.DragEvent) => {
    draggedItemRef.current = null;
    (e.currentTarget as HTMLElement).style.opacity = "1";
  }, []);

  // ── Folder drag handlers (for reordering folders) ──

  const handleFolderDragStart = useCallback(
    (e: React.DragEvent, folder: FolderType) => {
      const payload: DragPayload = {
        type: "folder",
        id: folder.id,
        position: folder.position,
      };
      draggedItemRef.current = payload;
      e.dataTransfer.setData("text/plain", JSON.stringify(payload));
      e.dataTransfer.effectAllowed = "move";
      (e.currentTarget as HTMLElement).style.opacity = "0.4";
    },
    []
  );

  const handleFolderDragEnd = useCallback((e: React.DragEvent) => {
    draggedItemRef.current = null;
    (e.currentTarget as HTMLElement).style.opacity = "1";
  }, []);

  // ── Folder drop target (for moving notes into folders, and reordering folders) ──

  const handleFolderDragOver = useCallback(
    (e: React.DragEvent, folderId: string) => {
      const payload = draggedItemRef.current;
      if (!payload) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverFolder(folderId);
    },
    []
  );

  const handleFolderDragLeave = useCallback(() => {
    setDragOverFolder(null);
  }, []);

  const handleFolderDrop = useCallback(
    (e: React.DragEvent, folder: FolderType) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverFolder(null);
      const payload = draggedItemRef.current;
      if (!payload) return;

      if (payload.type === "note") {
        if (payload.folderId !== folder.id) {
          // Move note to this folder
          noteStore.moveNote(payload.id, folder.id);
        } else {
          // Reorder within same folder
          handleReorderNotesInFolder(folder.id, payload.id, e);
        }
      } else if (payload.type === "folder") {
        if (payload.id !== folder.id) {
          // Reorder folders
          const sorted = [...st.folders].sort((a, b) => a.position - b.position);
          const draggedIdx = sorted.findIndex((f) => f.id === payload.id);
          const targetIdx = sorted.findIndex((f) => f.id === folder.id);
          if (draggedIdx === -1 || targetIdx === -1) return;

          const reordered = [...sorted];
          const [moved] = reordered.splice(draggedIdx, 1);
          reordered.splice(targetIdx, 0, moved);

          const items = reordered.map((f, i) => ({ id: f.id, position: i }));
          noteStore.reorderFolders(items);
        }
      }
    },
    [st.folders, handleReorderNotesInFolder]
  );

  const pinnedNotes = st.notes.filter((n) => n.pinned === 1);

  // Get notes for each folder
  const getFolderNotes = (folderId: string): Note[] => {
    return st.notes.filter((n) => n.folder_id === folderId);
  };

  // Close context menu on click outside
  useEffect(() => {
    const close = () => setFolderContextMenu(null);
    if (folderContextMenu) {
      window.addEventListener("click", close);
      return () => window.removeEventListener("click", close);
    }
  }, [folderContextMenu]);

  return (
    <aside
      className="flex flex-col h-full border-r-2 flex-shrink-0 overflow-hidden"
      style={{
        width: "280px",
        backgroundColor: "var(--color-bg-primary)",
        borderColor: "var(--color-border-primary)",
      }}
    >
      {/* Search bar */}
      <div className="px-3 pt-3 pb-2">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border-2 text-sm"
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            borderColor: "var(--color-border-primary)",
          }}
        >
          <Search className="w-4 h-4" style={{ color: "var(--color-text-tertiary)" }} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes... (Cmd+P)"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--color-text-primary)" }}
            onFocus={() => {
              window.dispatchEvent(new CustomEvent("open-quick-switcher"));
            }}
          />
          <span
            className="text-[10px] font-mono px-1 py-0.5 rounded border"
            style={{
              color: "var(--color-text-tertiary)",
              borderColor: "var(--color-border-secondary)",
            }}
          >
            ⌘P
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2">
        {/* Pinned section */}
        {pinnedNotes.length > 0 && (
          <div className="mb-3">
            <div
              className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              <Pin className="w-3 h-3" />
              Pinned
            </div>
            {pinnedNotes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                isActive={st.activeNoteId === note.id}
                onClick={() => handleNoteClick(note.slug)}
                onDragStart={(e) => handleNoteDragStart(e, note)}
                onDragEnd={handleNoteDragEnd}
              />
            ))}
          </div>
        )}

        {/* Folders section */}
        <div className="mb-3">
          <div
            className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            <Folder className="w-3 h-3" />
            Folders
          </div>

          {/* Folder tree */}
          {st.folders
            .sort((a, b) => a.position - b.position)
            .map((folder) => (
              <div key={folder.id}>
                <div
                  onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                  onDragLeave={handleFolderDragLeave}
                  onDrop={(e) => handleFolderDrop(e, folder)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-[var(--radius-sm)] cursor-pointer text-sm group hover:opacity-80 transition-colors"
                  style={{
                    color:
                      activeFolderId === folder.id
                        ? "var(--color-accent-primary)"
                        : "var(--color-text-secondary)",
                    backgroundColor:
                      activeFolderId === folder.id
                        ? "var(--color-accent-subtle)"
                        : dragOverFolder === folder.id
                        ? "var(--color-accent-subtle)"
                        : "transparent",
                  }}
                  onClick={() => handleFolderClick(folder.id)}
                  onContextMenu={(e) => handleFolderContextMenu(e, folder)}
                >
                  {expandedFolders.has(folder.id) ? (
                    <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                  )}
                  <Folder className="w-3.5 h-3.5 flex-shrink-0" />
                  {renamingFolder === folder.id ? (
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleRenameSubmit(folder.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameSubmit(folder.id);
                        if (e.key === "Escape") setRenamingFolder(null);
                      }}
                      className="flex-1 bg-transparent outline-none text-sm border-b px-0.5"
                      style={{
                        color: "var(--color-text-primary)",
                        borderColor: "var(--color-accent-primary)",
                      }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="flex-1 truncate">{folder.name}</span>
                  )}
                  <button
                    draggable
                    onDragStart={(e) => handleFolderDragStart(e, folder)}
                    onDragEnd={handleFolderDragEnd}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFolderContextMenu(e as any, folder);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[var(--color-bg-hover)] transition-opacity"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Folder notes (only show when expanded and notes match) */}
                {expandedFolders.has(folder.id) && (
                  <div className="ml-4">
                    {getFolderNotes(folder.id)
                      .filter((n) => n.pinned !== 1)
                      .sort((a, b) => a.position - b.position)
                      .map((note) => (
                        <NoteItem
                          key={note.id}
                          note={note}
                          isActive={st.activeNoteId === note.id}
                          onClick={() => handleNoteClick(note.slug)}
                          onDragStart={(e) => handleNoteDragStart(e, note)}
                          onDragEnd={handleNoteDragEnd}
                        />
                      ))}
                  </div>
                )}
              </div>
            ))}

          {/* Unfiled notes — notes without a folder */}
          {(() => {
            const unfiled = st.notes.filter((n) => !n.folder_id && n.pinned !== 1);
            if (unfiled.length === 0) return null;
            return (
              <div>
                <div
                  className="flex items-center gap-1 px-2 py-1.5 rounded-[var(--radius-sm)] text-sm cursor-pointer group transition-colors"
                  style={{
                    color: "var(--color-text-secondary)",
                    opacity: 0.6,
                  }}
                  onClick={() => setUnfiledExpanded(!unfiledExpanded)}
                >
                  {unfiledExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
                  )}
                  <Folder className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
                  <span className="flex-1 truncate text-xs font-medium">Unfiled</span>
                  <span className="text-xs opacity-50">{unfiled.length}</span>
                </div>
                {unfiledExpanded && (
                  <div className="ml-4">
                    {unfiled.map((note) => (
                      <NoteItem
                        key={note.id}
                        note={note}
                        isActive={st.activeNoteId === note.id}
                        onClick={() => handleNoteClick(note.slug)}
                        onDragStart={(e) => handleNoteDragStart(e, note)}
                        onDragEnd={handleNoteDragEnd}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Tags section */}
        {st.tags.length > 0 && (
          <div className="mb-3">
            <div
              className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              <Tag className="w-3 h-3" />
              Tags
            </div>
            <div className="flex flex-wrap gap-1 px-2">
              {st.tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className="text-xs px-2 py-0.5 rounded-[var(--radius-sm)] border transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border-secondary)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  #{tag}
                  {(() => {
                    const count = st.notes.filter((n) =>
                      n.tags?.split(",").map((t) => t.trim()).includes(tag)
                    ).length;
                    return count > 0 ? (
                      <span className="ml-1 opacity-60">{count}</span>
                    ) : null;
                  })()}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {st.loading && (
          <div className="flex justify-center py-4">
            <Loader2
              className="w-4 h-4 animate-spin"
              style={{ color: "var(--color-text-tertiary)" }}
            />
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div
        className="flex items-center gap-1 p-3 border-t-2"
        style={{ borderColor: "var(--color-border-primary)" }}
      >
        <button
          onClick={async () => {
            const note = await noteStore.createNote(
              undefined,
              activeFolderIdRef.current,
              undefined
            );
            if (note) {
              navigate(`/notes/${note.slug}`);
            }
          }}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-[var(--radius-md)] border-2 btn-brutal transition-all"
          style={{
            backgroundColor: "var(--color-accent-primary)",
            color: "#FFFFFF",
            borderColor: "var(--color-border-primary)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <Plus className="w-3.5 h-3.5" /> New Note
        </button>
        {creatingFolder ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = (e.target as HTMLFormElement).querySelector<HTMLInputElement>('input');
              const name = input?.value?.trim();
              if (name) {
                noteStore.createFolder(name).then(() => {
                  setExpandedFolders((prev) => {
                    const next = new Set(prev);
                    st.folders.forEach((f) => next.add(f.id));
                    return next;
                  });
                });
              }
              setCreatingFolder(false);
            }}
            className="flex items-center gap-1 flex-1"
          >
            <input
              type="text"
              placeholder="Folder name..."
              autoFocus
              className="w-full px-2 py-1 text-xs font-medium border-2 rounded-[var(--radius-sm)] outline-none"
              style={{
                backgroundColor: "var(--color-bg-primary)",
                borderColor: "var(--color-accent-primary)",
                color: "var(--color-text-primary)",
              }}
              onBlur={() => setCreatingFolder(false)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setCreatingFolder(false);
              }}
            />
          </form>
        ) : (
          <button
            onClick={handleCreateFolder}
            className="flex items-center justify-center w-9 h-9 rounded-[var(--radius-md)] border-2 btn-brutal transition-all"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              borderColor: "var(--color-border-primary)",
              color: "var(--color-text-secondary)",
              boxShadow: "var(--shadow-sm)",
            }}
            title="New Folder"
          >
            <Folder className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Folder context menu */}
      {folderContextMenu && (
        <div
          className="fixed z-50 w-44 py-1 rounded-[var(--radius-md)] border-2 animate-scaleIn"
          style={{
            left: folderContextMenu.x,
            top: folderContextMenu.y,
            backgroundColor: "var(--color-bg-primary)",
            borderColor: "var(--color-border-primary)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <button
            onClick={() => handleRenameFolder(folderContextMenu.folder)}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-[var(--color-bg-hover)] transition-colors"
            style={{ color: "var(--color-text-primary)" }}
          >
            <Pencil className="w-3.5 h-3.5" /> Rename
          </button>
          <button
            onClick={() => handleDeleteFolder(folderContextMenu.folder)}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-[var(--color-bg-hover)] transition-colors"
            style={{ color: "var(--color-error)" }}
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      )}
    </aside>
  );
}

// ── Note Item Sub-component ──

function NoteItem({
  note,
  isActive,
  onClick,
  onDragStart,
  onDragEnd,
}: {
  note: Note;
  isActive: boolean;
  onClick: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}) {
  return (
    <button
      data-note-id={note.id}
      draggable
      onClick={onClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="flex items-center gap-2 w-full px-2 py-1.5 rounded-[var(--radius-sm)] text-sm text-left transition-colors group"
      style={{
        backgroundColor: isActive ? "var(--color-accent-subtle)" : "transparent",
        color: isActive
          ? "var(--color-accent-primary)"
          : "var(--color-text-primary)",
      }}
      onMouseEnter={(e) => {
        if (!isActive)
          e.currentTarget.style.backgroundColor = "var(--color-bg-hover)";
      }}
      onMouseLeave={(e) => {
        if (!isActive)
          e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <FileText className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
      <span className="truncate flex-1">{note.title || "Untitled"}</span>
      {note.pinned === 1 && (
        <Pin className="w-3 h-3 opacity-40 flex-shrink-0" />
      )}
    </button>
  );
}