import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useNavigate } from 'react-router-dom';
import { FileText, Folder as FolderIcon } from 'lucide-react';

interface Folder { id: string; name: string; pages: Page[]; }
interface Page { id: string; title: string; slug: string; updated_at: string; }

export function NoteOverviewWidget() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const f: any[] = await invoke('list_folders');
        const foldersWithPages: Folder[] = await Promise.all(
          f.map(async (folder) => {
            const pages = await invoke<Page[]>('list_pages_in_folder', { folderId: folder.id });
            return { id: folder.id, name: folder.name, pages };
          })
        );
        // Also get root pages (no folder)
        const rootPages = await invoke<Page[]>('list_pages');
        // Add a virtual "root" folder
        foldersWithPages.unshift({ id: '_root', name: 'Unfiled', pages: rootPages });
        if (!cancelled) setFolders(foldersWithPages);
      } catch { /* silent */ }
      finally { if (!cancelled) setLoading(false); }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  const allPages = folders.flatMap(f => f.pages);
  const recentPages = [...allPages].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 5);
  const fmtDate = (d: string) => {
    const n = new Date(); const t = new Date(d); const diff = n.getTime() - t.getTime();
    if (diff < 86400000) return 'Today'; if (diff < 172800000) return 'Yest';
    return t.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-full p-4 flex flex-col" style={{ backgroundColor: '#BBF7D0' }}>
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Notes</span>
      {loading ? (
        <div className="flex items-center justify-center flex-1"><div className="animate-spin rounded-full h-5 w-5 border-2" style={{ borderColor: 'var(--color-text-tertiary)', borderTopColor: 'transparent' }} /></div>
      ) : (
        <>
          <div className="flex items-center gap-4 mt-1 mb-3">
            <div className="flex items-center gap-1.5">
              <FolderIcon className="h-4 w-4 text-[var(--color-accent-primary)]" />
              <span className="font-mono text-xl font-bold text-[var(--color-text-primary)]">{folders.length}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Folders</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-[var(--color-accent-primary)]" />
              <span className="font-mono text-xl font-bold text-[var(--color-text-primary)]">{allPages.length}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Pages</span>
            </div>
          </div>
          {recentPages.length > 0 ? (
            <div className="space-y-1.5 flex-1 overflow-y-auto">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)] mb-1.5">Recent</div>
              {recentPages.map(p => (
                <button key={p.id} onClick={() => navigate(`/notes/${p.slug}`)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-[8px] border-2 border-[#0D0D0D] bg-white/70 hover:bg-white transition-all text-left shadow-[2px_2px_0px_#0D0D0D] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#0D0D0D]">
                  <span className="text-[13px] font-bold text-[var(--color-text-primary)] truncate">{p.title || 'Untitled'}</span>
                  <span className="text-[10px] font-mono font-semibold text-[var(--color-text-tertiary)] flex-shrink-0">{fmtDate(p.updated_at)}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center flex-1"><p className="text-sm text-[var(--color-text-tertiary)]">No notes yet</p></div>
          )}
        </>
      )}
    </div>
  );
}
