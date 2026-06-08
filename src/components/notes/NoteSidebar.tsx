import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Folder, Page } from "../../types";
import {
  Folder as FolderIcon,
  FileText,
  Plus,
  Trash2,
  Pencil,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { CreateDialog } from "../common/CreateDialog";

interface NoteSidebarProps {
  selectedPageId: string | null;
  onSelectPage: (page: Page) => void;
  refreshKey: number;
}

// Module-level refresh trigger — set by NoteSidebar, called by NoteEditor
export let triggerNoteSidebarRefresh: () => void = () => {};

// Persist expanded folders across tab switches
let _expandedFolders = new Set<string>();

export function NoteSidebar({
  selectedPageId,
  onSelectPage,
  refreshKey,
}: NoteSidebarProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderPages, setFolderPages] = useState<Record<string, Page[]>>({});
  const [rootPages, setRootPages] = useState<Page[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(_expandedFolders)
  );
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showFolderDialog, setShowFolderDialog] = useState(false);

  const loadData = async () => {
    try {
      const f = await invoke<Folder[]>("list_folders");
      setFolders(f);
      const rp = await invoke<Page[]>("list_pages");
      setRootPages(rp);

      const fp: Record<string, Page[]> = {};
      for (const folder of f) {
        const pages = await invoke<Page[]>("list_pages_in_folder", {
          folderId: folder.id,
        });
        fp[folder.id] = pages;
      }
      setFolderPages(fp);
    } catch (err) {
      console.error("Failed to load notes:", err);
    }
  };

  useEffect(() => {
    triggerNoteSidebarRefresh = loadData;
    loadData();
  }, [refreshKey]);

  const createFolder = async (name: string) => {
    try {
      await invoke("create_folder", { name });
      setShowFolderDialog(false);
      loadData();
    } catch (err) {
      console.error("Failed to create folder:", err);
    }
  };

  const deleteFolder = async (id: string) => {
    if (!confirm("Delete this folder? Pages will be unassigned.")) return;
    try {
      await invoke("delete_folder", { id });
      loadData();
    } catch (err) {
      console.error("Failed to delete folder:", err);
    }
  };

  const renameFolder = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await invoke("rename_folder", { id, name: editName });
      setEditingFolder(null);
      loadData();
    } catch (err) {
      console.error("Failed to rename folder:", err);
    }
  };

  const createPage = async (folderId: string | null) => {
    try {
      await invoke("create_page", {
        title: "Untitled",
        folderId: folderId,
      });
      loadData();
    } catch (err) {
      console.error("Failed to create page:", err);
    }
  };

  const deletePage = async (id: string) => {
    if (!confirm("Delete this page?")) return;
    try {
      await invoke("delete_page", { id });
      if (selectedPageId === id) onSelectPage(null as any);
      loadData();
    } catch (err) {
      console.error("Failed to delete page:", err);
    }
  };

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      _expandedFolders = next; // persist to module variable
      return next;
    });
  };

  const sidebarBg = "#FFFBEB";

  return (
    <aside
      className="flex flex-col h-full border-r-2 flex-shrink-0"
      style={{
        width: "260px",
        backgroundColor: sidebarBg,
        borderColor: "var(--color-border-primary)",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b-2 flex-shrink-0"
        style={{ borderColor: "var(--color-border-primary)" }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Notes
          </span>
          <button
            onClick={() => setShowFolderDialog(true)}
            className="btn-brutal flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] border-2"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              borderColor: "var(--color-border-primary)",
              boxShadow: "var(--shadow-sm)",
            }}
            title="New folder"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Page list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-2 px-2">
        {/* Folders */}
        {folders.map((folder) => (
          <div key={folder.id} className="mt-0.5">
            {/* Folder header */}
            <div className="group flex items-center mb-0.5">
              <button
                onClick={() => toggleFolder(folder.id)}
                className="w-6 h-6 flex items-center justify-center flex-shrink-0 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-hover)] border-2 border-transparent hover:border-[var(--color-border-primary)] transition-all"
              >
                {expandedFolders.has(folder.id) ? (
                  <ChevronDown className="w-4 h-4" style={{ color: "var(--color-text-tertiary)" }} />
                ) : (
                  <ChevronRight className="w-4 h-4" style={{ color: "var(--color-text-tertiary)" }} />
                )}
              </button>

              <FolderIcon className="w-4 h-4 flex-shrink-0 ml-1" style={{ color: "var(--color-text-tertiary)" }} />

              {editingFolder === folder.id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => renameFolder(folder.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") renameFolder(folder.id);
                    if (e.key === "Escape") setEditingFolder(null);
                  }}
                  className="flex-1 mx-1.5 px-1 py-1 text-sm bg-transparent border-b-2 outline-none"
                  style={{ borderColor: "var(--color-accent-primary)" }}
                />
              ) : (
                <span
                  className="flex-1 px-1.5 py-1.5 text-sm truncate"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {folder.name}
                </span>
              )}

              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                <button
                  onClick={() => {
                    setEditingFolder(folder.id);
                    setEditName(folder.name);
                  }}
                  className="w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-hover)] border-2 border-transparent hover:border-[var(--color-border-primary)] transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" style={{ color: "var(--color-text-tertiary)" }} />
                </button>
                <button
                  data-testid="add-page"
                  onClick={() => createPage(folder.id)}
                  className="w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-hover)] border-2 border-transparent hover:border-[var(--color-border-primary)] transition-all"
                >
                  <Plus className="w-3.5 h-3.5" style={{ color: "var(--color-text-tertiary)" }} />
                </button>
                <button
                  onClick={() => deleteFolder(folder.id)}
                  className="w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-hover)] border-2 border-transparent hover:border-[var(--color-border-primary)] transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--color-text-tertiary)" }} />
                </button>
              </div>
            </div>

            {/* Pages in folder */}
            {expandedFolders.has(folder.id) &&
              (folderPages[folder.id] || []).map((page) => (
                <div key={page.id} className="group flex items-center ml-7 mb-0.5">
                  <button
                    onClick={() => onSelectPage(page)}
                    className="flex-1 flex items-center gap-2.5 px-2.5 py-1.5 rounded-[var(--radius-md)] transition-colors-fast text-sm truncate border-2"
                    style={{
                      backgroundColor:
                        selectedPageId === page.id
                          ? "var(--color-accent-subtle)"
                          : "transparent",
                      color:
                        selectedPageId === page.id
                          ? "var(--color-accent-primary)"
                          : "var(--color-text-secondary)",
                      borderColor:
                        selectedPageId === page.id
                          ? "var(--color-accent-primary)"
                          : "transparent",
                    }}
                  >
                    <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{page.title}</span>
                  </button>
                  <button
                    onClick={() => deletePage(page.id)}
                    className="opacity-0 group-hover:opacity-100 ml-1 w-5 h-5 flex items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-hover)] border-2 border-transparent hover:border-[var(--color-border-primary)] transition-all flex-shrink-0"
                  >
                    <Trash2 className="w-3 h-3" style={{ color: "var(--color-text-tertiary)" }} />
                  </button>
                </div>
              ))}
          </div>
        ))}

        {folders.length === 0 && (
          <div className="text-center py-12 px-4">
            <FileText
              className="w-10 h-10 mx-auto mb-3"
              style={{ color: "var(--color-text-tertiary)" }}
            />
            <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
              No folders yet
            </p>
            <button
              onClick={() => setShowFolderDialog(true)}
              className="btn-brutal mt-3 px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] border-2"
              style={{
                backgroundColor: "var(--color-accent-primary)",
                color: "#FFFFFF",
                borderColor: "var(--color-border-primary)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              Create first folder
            </button>
          </div>
        )}
      </div>

      <CreateDialog
        isOpen={showFolderDialog}
        onClose={() => setShowFolderDialog(false)}
        onCreate={createFolder}
        placeholder="Folder name..."
        title="New Folder"
      />
    </aside>
  );
}
