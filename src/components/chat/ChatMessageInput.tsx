import { useState, useRef, useCallback } from "react";
import { Send, Loader2 } from "lucide-react";

export function ChatMessageInput({
  onSend,
  isSending,
  placeholder = "Type a message...",
  toolBar,
}: {
  onSend: (content: string) => void;
  isSending: boolean;
  placeholder?: string;
  toolBar?: React.ReactNode;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isSending) return;
    onSend(trimmed);
    setValue("");
    if (inputRef.current) inputRef.current.style.height = "auto";
  }, [value, isSending, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex-shrink-0 border-t-2 px-4 py-3" style={{ backgroundColor: "var(--color-bg-primary)", borderColor: "var(--color-border-primary)" }}>
      <div className="relative flex items-center w-full gap-2">
        {/* Left side: tool icons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {toolBar}
        </div>

        {/* Textarea */}
        <div className="flex-1 min-w-0">
          <textarea ref={inputRef} value={value} onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown} placeholder={placeholder} rows={1}
            className="w-full resize-none rounded-[var(--radius-md)] border-2 px-3 py-2 text-sm outline-none"
            style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border-primary)", color: "var(--color-text-primary)", maxHeight: 120 }}
            onInput={(e) => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 120)}px`; }} />
        </div>

        {/* Send button */}
        <button onClick={handleSend} disabled={!value.trim() || isSending}
          className="btn-brutal flex items-center justify-center w-9 h-9 rounded-[var(--radius-md)] border-2 flex-shrink-0"
          style={{ backgroundColor: value.trim() ? "var(--color-accent-primary)" : "var(--color-bg-tertiary)", color: value.trim() ? "white" : "var(--color-text-tertiary)", borderColor: "var(--color-border-primary)", boxShadow: "var(--shadow-sm)" }}>
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
