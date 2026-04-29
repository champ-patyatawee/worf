import { useState, useEffect } from 'react';
import { socketService } from '@/services/socket';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/utils/cn';
import type { Reaction } from '@/types';

interface ReactionBadgeProps {
  reactions: Reaction[];
  messageId: string;
}

export function ReactionBadge({ reactions, messageId }: ReactionBadgeProps) {
  const [localReactions, setLocalReactions] = useState(reactions);
  const currentUserId = useAuthStore((state) => state.user?.id);

  useEffect(() => {
    setLocalReactions(reactions);
  }, [reactions]);

  useEffect(() => {
    const handleReactionAdded = (reaction: Reaction & { messageId?: string; message?: { id: string } }) => {
      if (reaction.messageId === messageId || reaction.message?.id === messageId) {
        setLocalReactions((prev) => {
          const existing = prev.find((r) => r.emoji === reaction.emoji && r.userId === reaction.userId);
          if (existing) return prev;
          return [...prev, reaction];
        });
      }
    };

    const handleReactionRemoved = (data: { messageId: string; userId: string; emoji: string }) => {
      if (data.messageId === messageId) {
        setLocalReactions((prev) =>
          prev.filter((r) => !(r.emoji === data.emoji && r.userId === data.userId))
        );
      }
    };

    socketService.onReactionAdded(handleReactionAdded);
    socketService.onReactionRemoved(handleReactionRemoved);

    return () => {
      socketService.offReactionAdded(handleReactionAdded);
      socketService.offReactionRemoved(handleReactionRemoved);
    };
  }, [messageId]);

  const handleAddReaction = (emoji: string) => {
    socketService.addReaction(messageId, emoji);
  };

  const handleRemoveReaction = (emoji: string) => {
    socketService.removeReaction(messageId, emoji);
  };

  const groupedReactions = localReactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, Reaction[]>);

  if (Object.keys(groupedReactions).length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(groupedReactions).map(([emoji, emojiReactions]) => {
        const count = emojiReactions.length;
        const hasCurrentUser = emojiReactions.some((r) => r.userId === currentUserId);

        return (
          <button
            key={emoji}
            onClick={() => hasCurrentUser ? handleRemoveReaction(emoji) : handleAddReaction(emoji)}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all-fast border-2',
              hasCurrentUser
                ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent-primary)] border-[var(--color-border-primary)] shadow-[2px_2px_0px_#0D0D0D]'
                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border-transparent hover:border-[var(--color-border-primary)]'
            )}
          >
            <span className="text-sm">{emoji}</span>
            <span className="font-bold tabular-nums">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
