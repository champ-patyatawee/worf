import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { KanbanSidebar } from '../components/kanban/KanbanSidebar';

// Persist last board across tab switches
let _persistedBoardSlug: string | null = null;

export function Kanban() {
  const navigate = useNavigate();
  const { boardId } = useParams<{ boardId: string }>();

  useEffect(() => {
    // Only redirect to persisted slug if no boardId in URL
    // This prevents overriding explicit navigation (e.g. from Dashboard widget)
    if (!boardId && _persistedBoardSlug) {
      navigate(`/kanban/${_persistedBoardSlug}`, { replace: true });
    }
  }, [boardId, navigate]);

  // Expose setter so KanbanSidebar can update it
  (window as any).__setPersistedBoardSlug = (slug: string) => {
    _persistedBoardSlug = slug;
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <KanbanSidebar />
      <KanbanBoard />
    </div>
  );
}
