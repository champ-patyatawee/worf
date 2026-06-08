import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { Page } from "../types";
import { NoteSidebar } from "../components/notes/NoteSidebar";
import { NoteEditor } from "../components/notes/NoteEditor";

// Persist selected page across tab switches (component unmount/remount)
let _persistedPageId: string | null = null;

export function Notes() {
  const navigate = useNavigate();
  const [selectedPageId, setSelectedPageId] = useState<string | null>(_persistedPageId);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSelectPage = useCallback((page: Page) => {
    _persistedPageId = page.id;
    setSelectedPageId(page.id);
    navigate(`/notes/${page.slug}`, { replace: true });
  }, [navigate]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Restore persisted page: fetch slug and navigate
  useEffect(() => {
    if (_persistedPageId) {
      invoke<any>("get_page", { id: _persistedPageId })
        .then((page) => {
          if (page?.slug) {
            navigate(`/notes/${page.slug}`, { replace: true });
          }
        })
        .catch(() => {});
    }
  }, []);

  return (
    <div className="flex-1 flex overflow-hidden">
      <NoteSidebar
        selectedPageId={selectedPageId}
        onSelectPage={handleSelectPage}
        refreshKey={refreshKey}
      />
      <NoteEditor />
    </div>
  );
}
