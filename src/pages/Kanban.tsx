import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { KanbanSidebar } from '../components/kanban/KanbanSidebar';

// Persist last board across tab switches
let _persistedBoardSlug: string | null = null;

export function Kanban() {
  const navigate = useNavigate();

  useEffect(() => {
    if (_persistedBoardSlug) {
      navigate(`/kanban/${_persistedBoardSlug}`, { replace: true });
    }
  }, []);

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
