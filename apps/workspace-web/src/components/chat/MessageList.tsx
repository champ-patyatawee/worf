import { useRef, useEffect, ReactNode, useCallback, useState } from 'react';
import { differenceInMinutes } from 'date-fns';
import { Message } from './Message';
import { DateDivider } from './DateDivider';
import { ThreadIndicator } from './ThreadIndicator';
import { cn } from '@/utils/cn';
import type { Message as MessageType } from '@/types';
import { formatMessageDate } from '@/utils/formatDate';
import { useAuthStore } from '@/stores/authStore';

const COMPACT_TIME_GAP_MINUTES = 5;
const PULL_THRESHOLD = 60;
const DAMPENING = 0.5;

type PullState = 'idle' | 'pulling' | 'ready' | 'loading';

interface MessageMeta {
  isCompact: boolean;
  showAvatar: boolean;
  showHeader: boolean;
  isOwn: boolean;
}

interface MessageListProps {
  messages: MessageType[];
  isLoading?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  className?: string;
  renderMessage?: (message: MessageType, index: number, messages: MessageType[], meta: MessageMeta) => ReactNode;
  onOpenThread?: (message: MessageType) => void;
  onLoadOlder?: () => void;
  highlightedMessageId?: string | null;
  scrollToBottomKey?: number;
}

export function MessageList({
  messages,
  isLoading,
  hasMore = false,
  isLoadingMore = false,
  className,
  renderMessage,
  onOpenThread,
  onLoadOlder,
  highlightedMessageId,
  scrollToBottomKey
}: MessageListProps) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  const [pullState, setPullState] = useState<PullState>('idle');
  const [pullDistance, setPullDistance] = useState(0);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);

  const touchStateRef = useRef({
    startY: 0,
    currentY: 0,
    isDragging: false,
  });

  const prevScrollHeightRef = useRef(0);
  const isLoadingOlderRef = useRef(false);
  const hasMoreRef = useRef(hasMore);
  const isAtTopRef = useRef(false);
  const prevMessagesLengthRef = useRef(messages.length);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    isAtTopRef.current = false;
  }, [messages]);

  useEffect(() => {
    isInitialMount.current = true;
  }, [highlightedMessageId]);

  useEffect(() => {
    if (isInitialMount.current && messages.length > 0 && !highlightedMessageId) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
      isInitialMount.current = false;
    }
  }, [messages, highlightedMessageId]);

  useEffect(() => {
    if (highlightedMessageId && containerRef.current) {
      const element = containerRef.current.querySelector(`[data-message-id="${highlightedMessageId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('bg-accent-subtle');
        setTimeout(() => {
          element.classList.remove('bg-accent-subtle');
        }, 2000);
      }
    }
  }, [highlightedMessageId, messages]);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && containerRef.current && !highlightedMessageId) {
      const element = containerRef.current.querySelector(`[data-message-id="${hash}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [messages, highlightedMessageId]);

  // Auto-scroll to bottom on send trigger (user hit Enter)
  useEffect(() => {
    if (scrollToBottomKey && scrollToBottomKey > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setNewMessageCount(0);
    }
  }, [scrollToBottomKey]);

  // Detect new messages arriving while scrolled up
  useEffect(() => {
    const prevLen = prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;
    if (messages.length > prevLen && !isAtBottom) {
      setNewMessageCount((prev) => prev + (messages.length - prevLen));
    }
  }, [messages, isAtBottom]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!hasMoreRef.current) return;
    const touch = e.touches[0];
    touchStateRef.current = {
      startY: touch.clientY,
      currentY: touch.clientY,
      isDragging: false,
    };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!hasMoreRef.current) return;
    const touch = e.touches[0];
    const { startY } = touchStateRef.current;
    const deltaY = touch.clientY - startY;

    if (deltaY > 0 && containerRef.current && containerRef.current.scrollTop <= 0) {
      touchStateRef.current.isDragging = true;
      touchStateRef.current.currentY = touch.clientY;
      const dampened = Math.min(deltaY * DAMPENING, PULL_THRESHOLD * 1.5);
      setPullDistance(dampened);

      if (dampened >= PULL_THRESHOLD) {
        setPullState('ready');
      } else {
        setPullState('pulling');
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!hasMoreRef.current) return;
    const { isDragging } = touchStateRef.current;

    if (!isDragging) return;

    if (pullState === 'ready' && !isLoadingOlderRef.current) {
      setPullState('loading');
      isLoadingOlderRef.current = true;
      prevScrollHeightRef.current = containerRef.current?.scrollHeight || 0;
      onLoadOlder?.();
    } else {
      setPullState('idle');
      setPullDistance(0);
    }

    touchStateRef.current.isDragging = false;
  }, [pullState, onLoadOlder]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    isAtTopRef.current = container.scrollTop <= 0;
    const threshold = 60;
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    setIsAtBottom(atBottom);
    if (atBottom) setNewMessageCount(0);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    let pullTriggered = false;
    let pullStartTime = 0;

    const handleWheel = (e: WheelEvent) => {
      if (!container.contains(e.target as Node)) return;

      if (e.deltaY < 0 && container.scrollTop <= 50 && hasMoreRef.current && !isLoadingMore && !isLoadingOlderRef.current) {
        e.preventDefault();

        if (!pullTriggered) {
          pullTriggered = true;
          pullStartTime = Date.now();
          setPullState('pulling');
          setPullDistance(40);
        }

        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          if (pullTriggered && Date.now() - pullStartTime >= 150) {
            pullTriggered = false;
            setPullState('loading');

            const prevHeight = container.scrollHeight;
            isLoadingOlderRef.current = true;
            prevScrollHeightRef.current = prevHeight;

            onLoadOlder?.();
          }
        }, 150);
      } else {
        if (pullTriggered) {
          pullTriggered = false;
          setPullState('idle');
          setPullDistance(0);
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [onLoadOlder, isLoadingMore]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (isLoadingOlderRef.current && prevScrollHeightRef.current > 0 && !isLoadingMore) {
      const addedHeight = container.scrollHeight - prevScrollHeightRef.current;
      if (addedHeight > 0) {
        container.scrollTop += addedHeight;
      }
      isLoadingOlderRef.current = false;
      prevScrollHeightRef.current = 0;
      setPullState('idle');
      setPullDistance(0);
    }
  }, [messages, isLoadingMore]);

  const getMessageMeta = useCallback((message: MessageType, index: number): MessageMeta => {
    const isOwn = message.userId === currentUserId;

    if (index === 0) {
      return { isCompact: false, showAvatar: true, showHeader: true, isOwn };
    }

    const prevMessage = messages[index - 1];
    const sameUser = prevMessage.userId === message.userId;
    const timeDiff = differenceInMinutes(
      new Date(message.createdAt),
      new Date(prevMessage.createdAt)
    );

    const isCompact = sameUser && timeDiff < COMPACT_TIME_GAP_MINUTES;

    return {
      isCompact,
      showAvatar: !isCompact,
      showHeader: !isCompact,
      isOwn,
    };
  }, [messages, currentUserId]);

  const getDividerDate = useCallback((message: MessageType, index: number): string | null => {
    if (index === 0) return formatMessageDate(message.createdAt);

    const prevMessage = messages[index - 1];
    const prevDate = new Date(prevMessage.createdAt);
    const currDate = new Date(message.createdAt);

    if (
      prevDate.getFullYear() !== currDate.getFullYear() ||
      prevDate.getMonth() !== currDate.getMonth() ||
      prevDate.getDate() !== currDate.getDate()
    ) {
      return formatMessageDate(message.createdAt);
    }

    return null;
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-[var(--color-text-tertiary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('flex-1 overflow-y-auto scrollbar-thin', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {hasMore && (
        <div
          className="flex items-center justify-center transition-all duration-200"
          style={{
            height: pullState === 'idle' ? 0 : pullDistance,
            opacity: pullState === 'idle' ? 0 : 1,
          }}
        >
          {pullState === 'loading' ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-[var(--color-accent-primary)] border-t-transparent" />
          ) : (
            <span className="text-xs text-[var(--color-text-tertiary)] font-medium">
              {pullState === 'ready' ? 'Release to load more' : 'Pull to load more'}
            </span>
          )}
        </div>
      )}

      <div className="py-2">
        {messages.map((message, index) => {
          const meta = getMessageMeta(message, index);
          const dividerDate = getDividerDate(message, index);

          return (
            <div key={message.id} data-message-id={message.id}>
              {dividerDate && <DateDivider date={dividerDate} />}
              {renderMessage ? (
                renderMessage(message, index, messages, meta)
              ) : (
                <>
                  <Message
                    message={message}
                    isOwn={meta.isOwn}
                    showAvatar={meta.showAvatar}
                  />
                  {message.threadCount && message.threadCount > 0 && onOpenThread && (
                    <div className="pl-12">
                      <ThreadIndicator
                        count={message.threadCount}
                        onClick={() => onOpenThread(message)}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
        {newMessageCount > 0 && (
          <div className="sticky bottom-4 flex justify-center">
            <button
              onClick={() => {
                bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
                setNewMessageCount(0);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold
                bg-[var(--color-accent-primary)] text-white border-2 border-[var(--color-border-primary)]
                shadow-[2px_2px_0px_#0D0D0D] hover:shadow-[3px_3px_0px_#0D0D0D]
                active:translate-x-[1px] active:translate-y-[1px] active:shadow-none
                transition-all duration-150 cursor-pointer"
            >
              <span className="text-base leading-none">↓</span>
              <span>{newMessageCount} new message{newMessageCount > 1 ? 's' : ''}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
