import { Bot, Check, Copy, User } from "lucide-react";
import type { ChatMessage } from "../../stores/chatSessionStore";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { UrlSourceCard } from "./UrlSourceCard";
import { useState } from "react";

export function AIMessage({ message, isStreaming }: { message: ChatMessage; isStreaming?: boolean }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed silently
    }
  };

  return (
    <div className={`flex gap-3 px-4 py-3 group ${isUser ? "" : "bg-[var(--color-bg-tertiary)]"}`}>
      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${isUser ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-subtle)]" : "border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]"}`}>
        {isUser ? <User className="w-4 h-4" style={{ color: "var(--color-accent-primary)" }} /> : <Bot className="w-4 h-4" style={{ color: "var(--color-text-secondary)" }} />}
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2 text-xs font-bold mb-1" style={{ color: isUser ? "var(--color-accent-primary)" : "var(--color-text-secondary)" }}>
          <span>{isUser ? "You" : "AI"}</span>
          {isStreaming && <span className="animate-pulse" style={{ color: "var(--color-accent-primary)" }}>...</span>}
          {!isUser && !isStreaming && (
            <button
              onClick={handleCopy}
              className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)]"
              aria-label={copied ? "Copied" : "Copy message"}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5" style={{ color: "var(--color-accent-primary)" }} />
              ) : (
                <Copy className="w-3.5 h-3.5" style={{ color: "var(--color-text-secondary)" }} />
              )}
            </button>
          )}
        </div>
        <div className="prose prose-sm max-w-none" style={{ color: "var(--color-text-primary)" }}>
          {isUser ? (
            <p style={{ whiteSpace: "pre-wrap" }}>{message.content}</p>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          )}
        </div>
        {/* URL source cards */}
        {message.url_contexts && message.url_contexts.length > 0 && (
          <UrlSourceCard sources={message.url_contexts} />
        )}
      </div>
    </div>
  );
}
