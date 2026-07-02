import { useEffect, useState } from "react";
import { Bot, MessageSquare, Plus, Trash2, Pencil } from "lucide-react";
import { chatSessionStore, type ChatSession } from "../../stores/chatSessionStore";
import { useNavigate, useLocation } from "react-router-dom";

export function ChatSessionSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [, forceUpdate] = useState(0);

  const { sessions, isLoading, activeSessionId } = chatSessionStore;

  useEffect(() => {
    chatSessionStore.fetchSessions();
    const unsub = chatSessionStore.subscribe(() => forceUpdate((n) => n + 1));
    return () => { unsub(); };
  }, []);

  useEffect(() => {
    const match = location.pathname.match(/\/ai-chat\/(.+)/);
    chatSessionStore.setActiveSession(match ? match[1] : null);
  }, [location.pathname]);

  const handleNewChat = async () => {
    const session = await chatSessionStore.createSession();
    navigate(`/ai-chat/${session.id}`);
  };

  const handleSelectChat = (id: string) => {
    if (editingId) return;
    chatSessionStore.setActiveSession(id);
    navigate(`/ai-chat/${id}`);
  };

  const handleDeleteChat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this chat session?")) return;
    await chatSessionStore.deleteSession(id);
    if (location.pathname.includes(id)) {
      (window as any).__setPersistedSessionId?.(null);
      navigate("/ai-chat");
    }
  };

  const handleStartEdit = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditValue(title || "");
  };

  const handleSaveEdit = async (id: string) => {
    const trimmed = editValue.trim();
    if (trimmed) await chatSessionStore.updateSession(id, { title: trimmed });
    setEditingId(null);
    setEditValue("");
  };

  return (
    <aside className="w-[260px] h-full flex flex-col flex-shrink-0 border-r-2" style={{ backgroundColor: "#FFFBEB", borderColor: "var(--color-border-primary)" }}>
      <div className="p-4 border-b-2" style={{ borderColor: "var(--color-border-primary)" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[var(--radius-md)] border-2 flex items-center justify-center" style={{ borderColor: "var(--color-border-primary)", backgroundColor: "var(--color-accent-primary)" }}>
            <Bot className="h-4 w-4 text-white" />
          </div>
          <span className="font-extrabold text-lg tracking-tight" style={{ color: "var(--color-text-primary)" }}>AI Chat</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="text-sm px-2 py-2 text-center font-medium" style={{ color: "var(--color-text-secondary)", opacity: 0.5 }}>Loading chats...</div>
        ) : sessions.length === 0 ? (
          <div className="text-sm px-2 py-2 text-center font-medium" style={{ color: "var(--color-text-secondary)", opacity: 0.5 }}>No chats yet.</div>
        ) : sessions.map((session) => {
          const isActive = activeSessionId === session.id;
          const isEditing = editingId === session.id;
          return (
            <div key={session.id} onClick={() => handleSelectChat(session.id)}
              className="group flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 mb-1 transition-colors cursor-pointer"
              style={{ backgroundColor: isActive ? "var(--color-accent-subtle)" : "transparent", borderLeft: isActive ? "3px solid var(--color-accent-primary)" : "3px solid transparent" }}>
              <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" style={{ color: isActive ? "var(--color-accent-primary)" : "var(--color-text-tertiary)", opacity: 0.5 }} />
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleSaveEdit(session.id)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(session.id); if (e.key === "Escape") { setEditingId(null); setEditValue(""); } }}
                    className="w-full px-1 py-0.5 text-sm border-b-2 outline-none bg-transparent"
                    style={{ borderColor: "var(--color-accent-primary)", color: "var(--color-text-primary)" }}
                    onClick={(e) => e.stopPropagation()} />
                ) : (
                  <p className="text-sm font-medium truncate" style={{ color: isActive ? "var(--color-accent-primary)" : "var(--color-text-primary)" }}>
                    {session.title || "New Chat"}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button onClick={(e) => handleStartEdit(e, session.id, session.title || "")}
                  className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--color-bg-hover)]">
                  <Pencil className="w-3 h-3" style={{ color: "var(--color-text-tertiary)" }} />
                </button>
                <button onClick={(e) => handleDeleteChat(e, session.id)}
                  className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--color-bg-hover)]">
                  <Trash2 className="w-3 h-3" style={{ color: "var(--color-error)" }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t-2 flex-shrink-0" style={{ borderColor: "var(--color-border-primary)" }}>
        <button onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-[var(--radius-md)] border-2 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none"
          style={{ backgroundColor: "var(--color-accent-primary)", color: "white", borderColor: "var(--color-border-primary)" }}>
          <Plus className="w-3.5 h-3.5" /> New Chat
        </button>
      </div>
    </aside>
  );
}
