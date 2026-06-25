import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot } from 'lucide-react';
import { chatSessionStore } from '../../stores/chatSessionStore';

function formatRelative(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString);
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
}

export function ChatTopicsWidget() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState(chatSessionStore.sessions);
  const [loading, setLoading] = useState(chatSessionStore.isLoading);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = chatSessionStore.subscribe(() => {
      setSessions([...chatSessionStore.sessions]);
      setLoading(chatSessionStore.isLoading);
    });

    chatSessionStore.fetchSessions()
      .catch((e: any) => setError(e?.message || 'Failed to load chat sessions'));

    return () => unsub();
  }, []);

  const visibleSessions = sessions.slice(0, 5);

  return (
    <div className="min-h-full p-4 flex flex-col" style={{ backgroundColor: '#E0E7FF' }}>
      <div className="flex items-center gap-2 mb-2">
        <Bot className="h-4 w-4 text-[var(--color-accent-primary)]" />
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">AI Chat</span>
      </div>
      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-5 w-5 border-2" style={{ borderColor: 'var(--color-text-tertiary)', borderTopColor: 'transparent' }} />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center flex-1">
          <p className="text-sm text-[var(--color-error)]">{error}</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex items-center justify-center flex-1">
          <p className="text-sm text-[var(--color-text-tertiary)]">No chat sessions yet</p>
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-1 mb-3">
            <span className="font-mono text-2xl font-bold text-[var(--color-text-primary)]">{sessions.length}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
              {sessions.length === 1 ? 'session' : 'sessions'}
            </span>
          </div>
          <div className="space-y-1.5 flex-1 overflow-y-auto">
            {visibleSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => {
                  (window as any).__setPersistedSessionId?.('');
                  navigate(`/ai-chat/${session.id}`);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] border-2 border-[#0D0D0D] bg-white/70 hover:bg-white transition-all text-left shadow-[2px_2px_0px_#0D0D0D] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#0D0D0D]"
              >
                <Bot className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent-primary)]" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-[var(--color-text-primary)] truncate">
                    {session.title || 'Untitled'}
                  </div>
                  <div className="text-[10px] font-medium text-[var(--color-text-tertiary)]">
                    {formatRelative(session.updated_at || session.created_at)}
                  </div>
                </div>
              </button>
            ))}
          </div>
          {sessions.length > 5 && (
            <button
              onClick={() => navigate('/ai-chat')}
              className="w-full text-center text-[11px] font-bold text-[var(--color-accent-primary)] mt-2 hover:underline py-1"
            >
              View all {sessions.length} sessions
            </button>
          )}
        </>
      )}
    </div>
  );
}
