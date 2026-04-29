import { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { noteApi } from '@/services/noteApi';
import type { Folder } from '@/types/note';
import {
  ChevronRight,
  Folder as FolderIcon,
  FileText,
  Plus,
  Trash2,
  Pencil,
  X,
  Check,
} from 'lucide-react';

const SIDEBAR_REFRESH_EVENT = 'note-sidebar-refresh';

export function triggerNoteSidebarRefresh() {
  window.dispatchEvent(new Event(SIDEBAR_REFRESH_EVENT));
}

export function NoteSidebar() {
  const location = useLocation();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [initialized, setInitialized] = useState(false);
  const expandedFoldersRef = useRef<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const loadFolders = async () => {
    try {
      const data = await noteApi.getFolders();
      setFolders(data);
      const current = expandedFoldersRef.current;
      if (current.size > 0) {
        setExpandedFolders(current);
      } else if (!initialized && data.length > 0) {
        const initial = new Set([data[0].id]);
        setExpandedFolders(initial);
        expandedFoldersRef.current = initial;
        setInitialized(true);
      }
    } catch (err) {
      console.error('Failed to load folders:', err);
    }
  };

  useEffect(() => {
    loadFolders();
  }, [location.pathname]);

  useEffect(() => {
    const handler = () => loadFolders();
    window.addEventListener(SIDEBAR_REFRESH_EVENT, handler);
    return () => window.removeEventListener(SIDEBAR_REFRESH_EVENT, handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const { folderId } = (e as CustomEvent).detail;
      const newExpanded = new Set(expandedFoldersRef.current);
      newExpanded.add(folderId);
      expandedFoldersRef.current = newExpanded;
      setExpandedFolders(newExpanded);
    };
    window.addEventListener('expand-folder', handler);
    return () => window.removeEventListener('expand-folder', handler);
  }, []);

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    expandedFoldersRef.current = newExpanded;
    setExpandedFolders(newExpanded);
  };

  const handleCreateFolder = async () => {
    const folder = await noteApi.createFolder('New Folder');
    setFolders([folder, ...folders]);
    const newExpanded = new Set([...expandedFolders, folder.id]);
    expandedFoldersRef.current = newExpanded;
    setExpandedFolders(newExpanded);
  };

  const handleDeleteFolder = async (folderId: string) => {
    await noteApi.deleteFolder(folderId);
    setFolders(folders.filter((f) => f.id !== folderId));
  };

  const handleRenameFolder = async (folderId: string) => {
    await noteApi.renameFolder(folderId, editingName);
    setFolders(folders.map((f) => (f.id === folderId ? { ...f, name: editingName } : f)));
    setEditingFolderId(null);
  };

  const handleCreatePage = async (folderId: string | null) => {
    await noteApi.createPage(folderId);
    await loadFolders();
  };

  const handleDeletePage = async (pageId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await noteApi.deletePage(pageId);
    await loadFolders();
  };

  return (
    <aside
      className="w-[260px] h-full flex flex-col flex-shrink-0 border-r-2"
      style={{ backgroundColor: '#FFFBEB', borderColor: 'var(--color-border-primary)' }}
    >
      {/* Header */}
      <div className="p-4 border-b-2" style={{ borderColor: 'var(--color-border-primary)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[var(--radius-md)] border-2 flex items-center justify-center" style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-accent-primary)' }}>
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Notes</span>
          </div>
          <button
            onClick={handleCreateFolder}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] border-2 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none"
            style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-bg-secondary)' }}
            title="New Folder"
          >
            <Plus className="h-4 w-4" style={{ color: 'var(--color-text-primary)' }} />
          </button>
        </div>
      </div>

      {/* Folder Tree */}
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        {folders.map((folder) => (
          <div key={folder.id} className="mb-2">
            {/* Folder Row */}
            <div className="flex items-center group rounded-[var(--radius-md)] px-2 py-1.5 transition-colors hover:bg-[var(--color-bg-hover)]" style={{ minHeight: 36 }}>
              <button
                onClick={() => toggleFolder(folder.id)}
                className="p-1 rounded-[var(--radius-md)] mr-1 transition-transform"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <ChevronRight
                  className={`h-4 w-4 transition-transform duration-200 ${expandedFolders.has(folder.id) ? 'rotate-90' : ''}`}
                />
              </button>
              <FolderIcon className="h-4 w-4 mr-2 flex-shrink-0" style={{ color: 'var(--color-text-secondary)', opacity: 0.7 }} />
              {editingFolderId === folder.id ? (
                <div className="flex-1 flex items-center gap-1">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border-2 rounded-[var(--radius-md)]"
                    style={{
                      borderColor: 'var(--color-accent-primary)',
                      backgroundColor: 'var(--color-bg-secondary)',
                      color: 'var(--color-text-primary)',
                      outline: 'none',
                    }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameFolder(folder.id);
                      if (e.key === 'Escape') setEditingFolderId(null);
                    }}
                  />
                  <button onClick={() => handleRenameFolder(folder.id)} className="p-1 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-hover)]">
                    <Check className="h-3 w-3" style={{ color: 'var(--color-success)' }} />
                  </button>
                  <button onClick={() => setEditingFolderId(null)} className="p-1 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-hover)]">
                    <X className="h-3 w-3" style={{ color: 'var(--color-error)' }} />
                  </button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{folder.name}</span>
                  <div className="hidden group-hover:flex items-center gap-0.5">
                    <button
                      onClick={() => handleCreatePage(folder.id)}
                      className="p-1.5 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-hover)] transition-colors"
                      title="New Page"
                    >
                      <Plus className="h-3.5 w-3.5" style={{ color: 'var(--color-text-secondary)', opacity: 0.7 }} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingFolderId(folder.id);
                        setEditingName(folder.name);
                      }}
                      className="p-1.5 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-hover)] transition-colors"
                      title="Rename"
                    >
                      <Pencil className="h-3.5 w-3.5" style={{ color: 'var(--color-text-secondary)', opacity: 0.7 }} />
                    </button>
                    <button
                      onClick={() => handleDeleteFolder(folder.id)}
                      className="p-1.5 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-hover)] transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--color-error)' }} />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Pages */}
            {expandedFolders.has(folder.id) && (
              <div className="ml-6 mt-0.5 space-y-0.5">
                {folder.pages.map((page) => {
                  const isActive = location.pathname === `/notes/${page.slug}`;
                  return (
                    <Link
                      key={page.id}
                      to={`/notes/${page.slug}`}
                      className="flex items-center group rounded-[var(--radius-md)] px-2 py-1.5 transition-colors"
                      style={{
                        backgroundColor: isActive ? 'var(--color-accent-subtle)' : 'transparent',
                        borderLeft: isActive ? '3px solid var(--color-accent-primary)' : '3px solid transparent',
                      }}
                    >
                      <FileText
                        className="h-4 w-4 mr-2 flex-shrink-0"
                        style={{
                          color: isActive ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                          opacity: isActive ? 1 : 0.5,
                        }}
                      />
                      <span
                        className="flex-1 text-sm truncate font-medium"
                        style={{
                          color: isActive ? 'var(--color-accent-primary)' : 'var(--color-text-primary)',
                          opacity: isActive ? 1 : 0.6,
                        }}
                      >
                        {page.title}
                      </span>
                      <button
                        onClick={(e) => handleDeletePage(page.id, e)}
                        className="hidden group-hover:block p-1 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-hover)]"
                      >
                        <Trash2 className="h-3 w-3" style={{ color: 'var(--color-error)' }} />
                      </button>
                    </Link>
                  );
                })}
                {folder.pages.length === 0 && (
                  <div
                    onClick={() => handleCreatePage(folder.id)}
                    className="text-xs px-2 py-1.5 cursor-pointer rounded-[var(--radius-md)] hover:bg-[var(--color-bg-hover)] font-medium"
                    style={{ color: 'var(--color-text-secondary)', opacity: 0.4 }}
                  >
                    + Add page
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {folders.length === 0 && (
          <div
            onClick={handleCreateFolder}
            className="text-sm px-2 py-2 cursor-pointer rounded-[var(--radius-md)] hover:bg-[var(--color-bg-hover)] font-medium"
            style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }}
          >
            + Create your first folder
          </div>
        )}
      </div>
    </aside>
  );
}
