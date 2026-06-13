import { useRef, useEffect } from "react";
import type { ChatMessage } from "../../stores/chatSessionStore";
import { AIMessage } from "./AIMessage";

export function MessageList({
  messages,
  isLoading,
  hasMore,
  isLoadingMore,
  onLoadOlder,
}: {
  messages: ChatMessage[];
  isLoading: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadOlder: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new message added
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages.length]);

  // Auto-load older messages when scrolling to top
  useEffect(() => {
    const el = topRef.current;
    if (!el || !hasMore || isLoadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          onLoadOlder();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadOlder]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--color-border-primary)", borderTopColor: "var(--color-accent-primary)" }} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      {/* Sentinel for scroll-to-top auto-load */}
      <div ref={topRef} />
      {hasMore && (
        <div className="text-center py-3">
          {isLoadingMore ? (
            <div className="w-5 h-5 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: "var(--color-border-primary)", borderTopColor: "var(--color-accent-primary)" }} />
          ) : (
            <button onClick={onLoadOlder} disabled={isLoadingMore}
              className="text-xs font-bold px-3 py-1.5 rounded-[var(--radius-md)] border-2 btn-brutal"
              style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border-primary)", color: "var(--color-text-tertiary)", boxShadow: "var(--shadow-sm)" }}>
              Load older messages
            </button>
          )}
        </div>
      )}
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Bot className="w-10 h-10 mx-auto mb-2" style={{ color: "var(--color-text-tertiary)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>Start a conversation</p>
          </div>
        </div>
      ) : (
        messages.map((msg, i) => (
          <AIMessage key={msg.id} message={msg} isStreaming={i === messages.length - 1 && msg.role === "assistant" && msg.content === ""} />
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}

function Bot(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="16" x2="8" y2="16" />
      <line x1="16" y1="16" x2="16" y2="16" />
    </svg>
  );
}
