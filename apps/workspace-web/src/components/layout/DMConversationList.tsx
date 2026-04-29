import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/common/Avatar';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/services/api';
import { socketService } from '@/services/socket';
import { cn } from '@/utils/cn';
import { createDMSlug } from '@/utils/slug';
import { MessageSquare } from 'lucide-react';
import type { User } from '@/types';

interface DMConversation {
  partnerId: string;
  partner: User;
  lastMessage?: {
    content: string;
    createdAt: string;
    userId: string;
  };
  unreadCount: number;
  updatedAt: string;
}

export function DMConversationList() {
  const currentUser = useAuthStore((state) => state.user);
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!currentUser) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getDMConversations();
      const data = (response as any).data || response;
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load conversations');
      console.error('Failed to fetch DM conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchConversations();
    }
  }, [currentUser, fetchConversations]);

  useEffect(() => {
    if (!currentUser) return;

    const handleNewDM = (message: any) => {
      setConversations((prev) => {
        const existing = prev.find((c) => c.partnerId === message.user.id);
        if (existing) {
          return prev.map((c) =>
            c.partnerId === message.user.id
              ? { ...c, lastMessage: message, updatedAt: new Date().toISOString() }
              : c
          ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        }
        return prev;
      });
    };

    const handleDMRead = () => {
      fetchConversations();
    };

    socketService.onNewDMMessage(handleNewDM);
    socketService.onDMRead(handleDMRead);

    return () => {
      socketService.offNewDMMessage(handleNewDM);
      socketService.offDMRead(handleDMRead);
    };
  }, [currentUser, fetchConversations]);

  const formatTimestamp = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="py-3 px-3 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="h-11 w-11 rounded-full bg-[var(--color-bg-hover)] border-2 border-[var(--color-border-primary)]" />
            <div className="flex-1">
              <div className="h-4 w-24 rounded mb-2 bg-[var(--color-bg-hover)]" />
              <div className="h-3 w-32 rounded bg-[var(--color-bg-hover)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6 px-3 text-center text-[13px] text-status-error">
        {error}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="py-8 px-3 text-center">
        <MessageSquare className="h-7 w-7 mx-auto mb-2 text-[var(--color-text-tertiary)]" />
        <p className="text-[13px] text-[var(--color-text-secondary)]">
          No conversations yet
        </p>
      </div>
    );
  }

  return (
    <div className="py-2 px-2">
      <div className="px-2 mb-2">
        <div className="h-px mb-3 bg-[var(--color-border-primary)]" />
        <span className="text-[12px] font-extrabold uppercase tracking-wider text-[var(--color-text-secondary)]">
          Messages
        </span>
      </div>
      {conversations.map((conversation) => (
        <Link
          key={conversation.partnerId}
          to={`/messages/${createDMSlug(conversation.partner.name)}`}
          className="group flex items-center gap-3 px-2 py-2.5 rounded-[var(--radius-md)] transition-all duration-150 mb-0.5 border-2 border-transparent hover:border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)]"
        >
          <div className="relative flex-shrink-0">
            <Avatar
              name={conversation.partner.name}
              src={conversation.partner.avatar}
              size="md"
              status={conversation.partner.status}
            />
            {conversation.unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full text-[10px] font-extrabold flex items-center justify-center border border-[var(--color-border-primary)]"
                style={{
                  color: 'white',
                  backgroundColor: 'var(--color-accent-primary)',
                  boxShadow: '2px 2px 0px #0D0D0D',
                }}
              >
                {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <p
                className={cn(
                  'text-[15px] truncate',
                  conversation.unreadCount > 0 ? 'text-[var(--color-text-primary)] font-bold' : 'text-[var(--color-text-secondary)] font-medium'
                )}
              >
                {conversation.partner.name}
              </p>
              {conversation.lastMessage && (
                <span className="text-[11px] tabular-nums flex-shrink-0 ml-2 text-[var(--color-text-tertiary)]">
                  {formatTimestamp(conversation.lastMessage.createdAt)}
                </span>
              )}
            </div>
            {conversation.lastMessage && (
              <p className="text-[13px] truncate text-[var(--color-text-tertiary)]">
                {conversation.lastMessage.userId === currentUser?.id ? (
                  <span className="opacity-70">You: </span>
                ) : null}
                {conversation.lastMessage.content}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
