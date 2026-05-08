import { useEffect } from 'react';
import { Bot, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { useChatSessionStore } from '@/stores/chatSessionStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { formatDistanceToNow } from 'date-fns';

export function ChatSessionSidebar() {
  const { sessions, isLoading, activeSessionId, fetchSessions, createSession, deleteSession, setActiveSession } = useChatSessionStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Sync active session from URL
  useEffect(() => {
    const match = location.pathname.match(/\/ai-chat\/(.+)/);
    if (match) {
      setActiveSession(match[1]);
    } else {
      setActiveSession(null);
    }
  }, [location.pathname, setActiveSession]);

  const handleNewChat = async () => {
    try {
      const session = await createSession();
      navigate(`/ai-chat/${session.id}`);
    } catch (err) {
      console.error('Failed to create new chat:', err);
    }
  };

  const handleSelectChat = (sessionId: string) => {
    setActiveSession(sessionId);
    navigate(`/ai-chat/${sessionId}`);
  };

  const handleDeleteChat = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this chat session?')) return;
    try {
      await deleteSession(sessionId);
      if (location.pathname.includes(sessionId)) {
        navigate('/ai-chat');
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  return (
    <aside
      className="w-[260px] h-full flex flex-col flex-shrink-0 border-r-2"
      style={{ backgroundColor: '#FFFBEB', borderColor: 'var(--color-border-primary)' }}
    >
      <div className="p-4 border-b-2" style={{ borderColor: 'var(--color-border-primary)' }}>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-[var(--radius-md)] border-2 flex items-center justify-center"
            style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-accent-primary)' }}
          >
            <Bot className="h-4 w-4 text-white" />
          </div>
          <span className="font-extrabold text-lg tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            AI Chat
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="text-sm px-2 py-2 text-center font-medium" style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }}>
            Loading chats...
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-sm px-2 py-2 text-center font-medium" style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }}>
            No chats yet. Start a new one!
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = activeSessionId === session.id;
            return (
              <button
                key={session.id}
                onClick={() => handleSelectChat(session.id)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 mb-1 transition-colors text-left',
                )}
                style={{
                  backgroundColor: isActive ? 'var(--color-accent-subtle)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--color-accent-primary)' : '3px solid transparent',
                }}
              >
                <MessageSquare
                  className="h-3.5 w-3.5 flex-shrink-0"
                  style={{ color: isActive ? 'var(--color-accent-primary)' : 'var(--color-text-tertiary)', opacity: 0.5 }}
                />
                <div className="flex-1 min-w-0">
                  <span
                    className="block text-sm truncate font-medium"
                    style={{
                      color: isActive ? 'var(--color-accent-primary)' : 'var(--color-text-primary)',
                      opacity: isActive ? 1 : 0.7,
                    }}
                  >
                    {session.title || 'New Chat'}
                  </span>
                  <span className="block text-xs truncate" style={{ color: 'var(--color-text-tertiary)', opacity: 0.5 }}>
                    {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
                  </span>
                </div>
                <button
                  onClick={(e) => handleDeleteChat(e, session.id)}
                  className="p-1 rounded hover:bg-bg-hover transition-colors-fast flex-shrink-0 opacity-0 group-hover:opacity-100"
                  style={{ opacity: isActive ? 0.6 : 0 }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.6'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = isActive ? '0.6' : '0'; }}
                >
                  <Trash2 className="h-3 w-3" style={{ color: 'var(--color-text-tertiary)' }} />
                </button>
              </button>
            );
          })
        )}
      </div>

      {/* New Chat Button — always at bottom */}
      <div className="p-3 border-t-2" style={{ borderColor: 'var(--color-border-primary)' }}>
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-[var(--radius-md)] font-semibold text-sm transition-all duration-150 border-2"
          style={{
            backgroundColor: 'var(--color-accent-primary)',
            color: '#FFFFFF',
            borderColor: 'var(--color-border-primary)',
            boxShadow: '3px 3px 0px #0D0D0D',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '5px 5px 0px #0D0D0D'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '3px 3px 0px #0D0D0D'; }}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </button>
      </div>
    </aside>
  );
}
