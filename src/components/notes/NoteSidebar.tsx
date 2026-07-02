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
  RotateCcw,
} from "lucide-react";
import { noteStore, triggerSidebarRefresh } from "./noteStore";
import type { Note, Folder as FolderType } from "./Types";
import { FolderCreateModal } from "./FolderCreateModal";

// ── Module-level drag state (shared via pointer events, like KanbanTaskCard) ──

const dragState = {
  noteId: null as string | null,
  sourceFolderId: null as string | null,
  ghostEl: null as HTMLElement | null,
  offsetX: 0,
  offsetY: 0,
  isDragging: false,
};

function cleanupDrag() {
  if (dragState.ghostEl) {
    dragState.ghostEl.remove();
    dragState.ghostEl = null;
  }
  dragState.noteId = null;
  dragState.sourceFolderId = null;
  dragState.isDragging = false;
}

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
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [restoreMenu, setRestoreMenu] = useState<{ noteId: string; x: number; y: number } | null>(null);
  const selectedNoteIdsRef = useRef<Set<string>>(new Set());
  /** Ref to access setDragOverFolder from global handlers without stale closure */
  const setDragOverFolderRef = useRef(setDragOverFolder);
  setDragOverFolderRef.current = setDragOverFolder;

  const st = noteStore.state;

  useEffect(() => {
    const unsub = noteStore.subscribe(() => forceUpdate((n) => n + 1));
    noteStore.loadFolders();
    noteStore.loadAllNotes();
    return () => unsub();
  }, []);

  // Refresh when sidebarRefreshKey changes (triggered from editor)
  useEffect(() => {
    const key = st.sidebarRefreshKey; // still depend on key for refresh
    noteStore.loadAllNotes();
    noteStore.loadFolders();
  }, [st.sidebarRefreshKey]);

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

  // ── Reorder logic (refactored — no longer takes DragEvent) ──

  const handleReorderNotesInFolder = useCallback(
    (folderId: string, noteId: string, targetNoteId: string) => {
      if (targetNoteId === noteId) return;

      const folderNotesList = st.notes
        .filter((n) => n.folder_id === folderId && n.pinned !== 1)
        .sort((a, b) => a.position - b.position);

      const draggedIdx = folderNotesList.findIndex((n) => n.id === noteId);
      const targetIdx = folderNotesList.findIndex((n) => n.id === targetNoteId);
      if (draggedIdx === -1 || targetIdx === -1) return;

      const reordered = [...folderNotesList];
      const [moved] = reordered.splice(draggedIdx, 1);
      reordered.splice(targetIdx, 0, moved);

      const items = reordered.map((n, i) => ({ id: n.id, position: i }));
      noteStore.reorderNotes(items);
    },
    [st.notes]
  );

  // ── Pointer-event drag system (replaces HTML5 drag-and-drop) ──

  // Stable ref for the latest notes/folders so global handlers don't go stale
  const notesRef = useRef(st.notes);
  notesRef.current = st.notes;
  const foldersRef = useRef(st.folders);
  foldersRef.current = st.folders;
  const reorderRef = useRef(handleReorderNotesInFolder);
  reorderRef.current = handleReorderNotesInFolder;

  // Keep selectedNoteIdsRef in sync with state
  useEffect(() => { selectedNoteIdsRef.current = selectedNoteIds; }, [selectedNoteIds]);

  // Handle pointer down on a note — store drag start info, wait for movement
  const handleNotePointerDown = useCallback(
    (e: React.PointerEvent, note: Note) => {
      if (e.button !== 0) return;
      // Don't start drag from buttons inside the note item
      if ((e.target as HTMLElement).closest('button, input, textarea')) return;

      const el = e.currentTarget as HTMLElement;
      const rect = el.getBoundingClientRect();

      dragState.noteId = note.id;
      dragState.sourceFolderId = note.folder_id;
      dragState.offsetX = e.clientX - rect.left;
      dragState.offsetY = e.clientY - rect.top;
      dragState.isDragging = true;

      el.setPointerCapture(e.pointerId);
      el.style.cursor = 'grabbing';
    },
    []
  );

  // Global pointermove handler — creates ghost on first move, then moves it
  const handleGlobalPointerMove = useCallback((e: PointerEvent) => {
    if (!dragState.isDragging) return;

    // Create ghost on first pointer move (not on pointerDown, so clicks still work)
    if (!dragState.ghostEl) {
      // Find the note element by data-note-id
      const noteEl = document.querySelector(
        `[data-note-id="${dragState.noteId}"]`
      ) as HTMLElement | null;
      if (!noteEl) return;

      const ghost = noteEl.cloneNode(true) as HTMLElement;
      ghost.style.position = 'fixed';
      ghost.style.left = `${e.clientX - dragState.offsetX}px`;
      ghost.style.top = `${e.clientY - dragState.offsetY}px`;
      ghost.style.width = `${noteEl.offsetWidth}px`;
      ghost.style.zIndex = '9999';
      ghost.style.pointerEvents = 'none';
      ghost.style.opacity = '0.85';
      ghost.style.transform = 'rotate(2deg) scale(1.02)';
      ghost.style.boxShadow = '8px 8px 0px #0D0D0D';
      ghost.style.transition = 'none';
      // Hide action buttons in ghost
      ghost.querySelectorAll('button').forEach((btn) => { btn.style.opacity = '0'; });
      document.body.appendChild(ghost);
      dragState.ghostEl = ghost;
    }

    // Move the ghost
    dragState.ghostEl.style.left = `${e.clientX - dragState.offsetX}px`;
    dragState.ghostEl.style.top = `${e.clientY - dragState.offsetY}px`;

    // Highlight folder under cursor
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el) {
      const folderRow = el.closest('[data-folder-id]') as HTMLElement | null;
      if (folderRow) {
        const fid = folderRow.getAttribute('data-folder-id');
        setDragOverFolderRef.current(fid);
      } else {
        setDragOverFolderRef.current(null);
      }
    } else {
      setDragOverFolderRef.current(null);
    }
  }, []);

  // Global pointerup handler — performs the drop
  const handleGlobalPointerUp = useCallback((e: PointerEvent) => {
    if (!dragState.isDragging) {
      cleanupDrag();
      return;
    }

    const noteId = dragState.noteId!;
    const sourceFolderId = dragState.sourceFolderId;
    cleanupDrag();
    // Reset folder highlight
    setDragOverFolderRef.current(null);
    // Restore pointer capture release if needed
    const noteEl = document.querySelector(`[data-note-id="${noteId}"]`) as HTMLElement | null;
    if (noteEl) {
      noteEl.style.cursor = '';
    }

    // Find what's under the pointer
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;

    // Check if dropped on a folder
    const folderRow = el.closest('[data-folder-id]') as HTMLElement | null;
    if (folderRow) {
      const targetFolderId = folderRow.getAttribute('data-folder-id');
      if (!targetFolderId) return;

      if (targetFolderId !== sourceFolderId) {
        // Move note(s) to a different folder
        const selectedIds = selectedNoteIdsRef.current;
        if (selectedIds.size > 0 && selectedIds.has(noteId)) {
          noteStore.moveNotes(Array.from(selectedIds), targetFolderId);
          setSelectedNoteIds(new Set());
        } else {
          noteStore.moveNote(noteId, targetFolderId);
        }
      } else {
        // Same folder — check if dropped on another note (reorder)
        const noteRow = el.closest('[data-note-id]') as HTMLElement | null;
        if (noteRow) {
          const targetNoteId = noteRow.getAttribute('data-note-id');
          if (targetNoteId && targetNoteId !== noteId) {
            reorderRef.current(targetFolderId, noteId, targetNoteId);
          }
        }
      }
      return;
    }

    // Not on a folder — check if dropped on a note in the unpinned/root area
    // (e.g. moving from one folder's expanded list to another)
    const noteRow = el.closest('[data-note-id]') as HTMLElement | null;
    if (noteRow) {
      const targetNoteId = noteRow.getAttribute('data-note-id');
      if (targetNoteId && targetNoteId !== noteId) {
        // Find which folder this target note belongs to
        const target = notesRef.current.find((n) => n.id === targetNoteId);
        if (target && target.folder_id === sourceFolderId) {
          reorderRef.current(sourceFolderId!, noteId, targetNoteId);
        } else if (target && target.folder_id !== sourceFolderId && target.folder_id) {
          // Move to target note's folder and insert at that position
          const selectedIds = selectedNoteIdsRef.current;
          if (selectedIds.size > 0 && selectedIds.has(noteId)) {
            noteStore.moveNotes(Array.from(selectedIds), target.folder_id);
            setSelectedNoteIds(new Set());
          } else {
            noteStore.moveNote(noteId, target.folder_id);
          }
        }
      }
    }
  }, []);

  // Register/unregister global pointer listeners
  useEffect(() => {
    document.addEventListener('pointermove', handleGlobalPointerMove);
    document.addEventListener('pointerup', handleGlobalPointerUp);
    return () => {
      document.removeEventListener('pointermove', handleGlobalPointerMove);
      document.removeEventListener('pointerup', handleGlobalPointerUp);
      cleanupDrag();
    };
  }, [handleGlobalPointerMove, handleGlobalPointerUp]);

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
                onClick={(e) => {
                  e.stopPropagation();
                  if (e.shiftKey && lastClickedId) {
                    // Range select — select all non-pinned notes between last clicked and this one
                    const allNotes = st.notes.filter((n) => n.pinned !== 1);
                    const allIds = allNotes.map((n) => n.id);
                    const lastIdx = allIds.indexOf(lastClickedId);
                    const currentIdx = allIds.indexOf(note.id);
                    if (lastIdx !== -1 && currentIdx !== -1) {
                      const [start, end] = lastIdx < currentIdx ? [lastIdx, currentIdx] : [currentIdx, lastIdx];
                      const rangeIds = allIds.slice(start, end + 1);
                      setSelectedNoteIds(new Set(rangeIds));
                    }
                  } else if (e.metaKey || e.ctrlKey) {
                    // Toggle single note
                    setSelectedNoteIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(note.id)) next.delete(note.id);
                      else next.add(note.id);
                      return next;
                    });
                  } else {
                    // Normal click — navigate
                    if (selectedNoteIds.size <= 1) {
                      handleNoteClick(note.slug);
                    }
                    setSelectedNoteIds(new Set([note.id]));
                    setLastClickedId(note.id);
                  }
                }}
                isSelected={selectedNoteIds.has(note.id)}
                onPointerDown={(e) => handleNotePointerDown(e, note)}
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
                  data-folder-id={folder.id}
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
                      .sort((a, b) => a.position - b.position)
                      .map((note) => (
                        <NoteItem
                          key={note.id}
                          note={note}
                          isActive={st.activeNoteId === note.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (e.shiftKey && lastClickedId) {
                              // Range select
                              const allNotes = st.notes.filter((n) => n.pinned !== 1);
                              const allIds = allNotes.map((n) => n.id);
                              const lastIdx = allIds.indexOf(lastClickedId);
                              const currentIdx = allIds.indexOf(note.id);
                              if (lastIdx !== -1 && currentIdx !== -1) {
                                const [start, end] = lastIdx < currentIdx ? [lastIdx, currentIdx] : [currentIdx, lastIdx];
                                const rangeIds = allIds.slice(start, end + 1);
                                setSelectedNoteIds(new Set(rangeIds));
                              }
                            } else if (e.metaKey || e.ctrlKey) {
                              setSelectedNoteIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(note.id)) next.delete(note.id);
                                else next.add(note.id);
                                return next;
                              });
                            } else {
                              if (selectedNoteIds.size <= 1) {
                                handleNoteClick(note.slug);
                              }
                              setSelectedNoteIds(new Set([note.id]));
                              setLastClickedId(note.id);
                            }
                          }}
                          isSelected={selectedNoteIds.has(note.id)}
                          onPointerDown={(e) => handleNotePointerDown(e, note)}
                        />
                      ))}
                  </div>
                )}
              </div>
            ))}

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

      {/* ── Trash section (sticky below scroll) ── */}
      <div className="flex-shrink-0 border-t-2" style={{ borderColor: "var(--color-border-primary)" }}>
        <div
          onClick={() => {
            setShowTrash(!showTrash);
            if (!showTrash) noteStore.loadTrashNotes();
          }}
          className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:opacity-80 transition-colors"
          style={{
            color: showTrash ? "var(--color-accent-primary)" : "var(--color-text-secondary)",
            backgroundColor: showTrash ? "var(--color-accent-subtle)" : "transparent",
          }}
        >
          <Trash2 className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 text-sm font-semibold">Trash</span>
          {st.trashNotes.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border"
              style={{ borderColor: "var(--color-border-primary)", color: "var(--color-text-tertiary)" }}>
              {st.trashNotes.length}
            </span>
          )}
          {showTrash ? (
            <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
          )}
        </div>

        {/* Trash notes list (expanded) */}
        {showTrash && (
          <div className="max-h-48 overflow-y-auto border-t" style={{ borderColor: "var(--color-border-secondary)" }}>
            {st.trashNotes.length === 0 ? (
              <div className="px-3 py-3 text-xs text-center" style={{ color: "var(--color-text-tertiary)" }}>
                Trash is empty
              </div>
            ) : (
              <>
                {st.trashNotes.map((note) => (
                  <div key={note.id}
                    className="flex items-center gap-2 px-3 py-2 text-sm border-b last:border-b-0"
                    style={{ borderColor: "var(--color-border-secondary)" }}
                  >
                    <FileText className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
                    <span className="flex-1 truncate" style={{ color: "var(--color-text-secondary)" }}>
                      {note.title || "Untitled"}
                    </span>
                    <>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setRestoreMenu(
                            restoreMenu?.noteId === note.id
                              ? null
                              : { noteId: note.id, x: rect.left, y: rect.bottom + 4 }
                          );
                        }}
                        className="p-1 rounded hover:bg-[var(--color-bg-hover)] transition-colors"
                        title="Restore to..."
                      >
                        <RotateCcw className="w-3.5 h-3.5" style={{ color: "var(--color-accent-primary)" }} />
                      </button>
                      {restoreMenu?.noteId === note.id && (
                        <div className="fixed z-50 w-40 py-1 rounded-[var(--radius-md)] border-2 animate-scaleIn"
                          style={{
                            left: restoreMenu.x,
                            top: restoreMenu.y,
                            backgroundColor: "var(--color-bg-primary)",
                            borderColor: "var(--color-border-primary)",
                            boxShadow: "var(--shadow-card)",
                          }}>
                          <button
                            onClick={async () => {
                              await noteStore.restoreNote(note.id, null);
                              setRestoreMenu(null);
                            }}
                            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-[var(--color-bg-hover)]"
                            style={{ color: "var(--color-text-primary)" }}
                          >
                            <FileText className="w-3 h-3" />
                            Unfiled
                          </button>
                          {st.folders.map((f) => (
                            <button
                              key={f.id}
                              onClick={async () => {
                                await noteStore.restoreNote(note.id, f.id);
                                setRestoreMenu(null);
                              }}
                              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-[var(--color-bg-hover)]"
                              style={{ color: "var(--color-text-primary)" }}
                            >
                              <Folder className="w-3 h-3" />
                              {f.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm(`Permanently delete "${note.title || "Untitled"}"?`)) {
                          await noteStore.permanentDeleteNote(note.id);
                        }
                      }}
                      className="p-1 rounded hover:bg-[var(--color-bg-hover)] transition-colors"
                      title="Delete permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--color-error)" }} />
                    </button>
                  </div>
                ))}
                {/* Empty Trash button */}
                {st.trashNotes.length > 0 && (
                  <button
                    onClick={async () => {
                      if (confirm(`Permanently delete all ${st.trashNotes.length} trashed notes?`)) {
                        await noteStore.emptyTrash();
                      }
                    }}
                    className="w-full px-3 py-2 text-xs font-bold text-center hover:bg-[var(--color-bg-hover)] transition-colors"
                    style={{ color: "var(--color-error)" }}
                  >
                    Empty Trash
                  </button>
                )}
              </>
            )}
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
            const folderId = activeFolderIdRef.current || st.draftFolderId;
            const note = await noteStore.createNote(
              undefined,
              folderId,
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
        <button
          onClick={() => setShowFolderModal(true)}
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

      {/* ── Batch action bar (shown when multiple notes selected) ── */}
      {selectedNoteIds.size > 1 && (
        <div
          className="flex items-center gap-2 px-3 py-2 border-t-2"
          style={{
            backgroundColor: "var(--color-accent-subtle)",
            borderColor: "var(--color-border-primary)",
          }}
        >
          <span className="text-xs font-semibold" style={{ color: "var(--color-accent-primary)" }}>
            {selectedNoteIds.size} selected
          </span>
          <button
            onClick={() => setShowMoveDialog(true)}
            className="px-2 py-1 text-xs font-bold rounded border-2"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              borderColor: "var(--color-border-primary)",
              color: "var(--color-text-primary)",
            }}
          >
            Move to folder...
          </button>
          <button
            onClick={() => setSelectedNoteIds(new Set())}
            className="px-2 py-1 text-xs rounded border"
            style={{
              borderColor: "var(--color-border-secondary)",
              color: "var(--color-text-tertiary)",
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Restore menu backdrop */}
      {restoreMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setRestoreMenu(null)} />
      )}

      {/* ── Move dialog ── */}
      {showMoveDialog && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMoveDialog(false)}
          />
          <div
            className="fixed z-50 w-48 py-1 rounded-[var(--radius-md)] border-2 animate-scaleIn"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              backgroundColor: "var(--color-bg-primary)",
              borderColor: "var(--color-border-primary)",
              boxShadow: "var(--shadow-modal)",
            }}
          >
            <div
              className="px-3 py-2 text-xs font-semibold border-b-2"
              style={{ borderColor: "var(--color-border-primary)" }}
            >
              Move {selectedNoteIds.size} notes to...
            </div>
            <div className="py-1">
              {st.folders.map((f) => (
                <button
                  key={f.id}
                  onClick={async () => {
                    await noteStore.moveNotes(Array.from(selectedNoteIds), f.id);
                    setSelectedNoteIds(new Set());
                    setShowMoveDialog(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-[var(--color-bg-hover)]"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  <Folder className="w-3.5 h-3.5" />
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <FolderCreateModal
        isOpen={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        onCreated={async (name) => {
          const folder = await noteStore.createFolder(name);
          if (folder) {
            setExpandedFolders((prev) => {
              const next = new Set(prev);
              st.folders.forEach((f) => next.add(f.id));
              return next;
            });
          }
        }}
      />
    </aside>
  );
}

// ── Note Item Sub-component ──

function NoteItem({
  note,
  isActive,
  onClick,
  onPointerDown,
  isSelected,
}: {
  note: Note;
  isActive: boolean;
  onClick: (e: React.MouseEvent) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  isSelected: boolean;
}) {
  return (
    <div
      data-note-id={note.id}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onPointerDown={onPointerDown}
      className="flex items-center gap-2 w-full px-2 py-1.5 rounded-[var(--radius-sm)] text-sm text-left transition-colors group cursor-grab active:cursor-grabbing select-none touch-none"
      style={{
        touchAction: 'none',
        backgroundColor: isActive ? "var(--color-accent-subtle)" : "transparent",
        color: isActive
          ? "var(--color-accent-primary)"
          : "var(--color-text-primary)",
        outline: isSelected ? "2px solid var(--color-accent-primary)" : undefined,
        outlineOffset: "-2px",
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
    </div>
  );
}