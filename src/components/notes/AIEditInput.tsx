import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Loader2 } from "lucide-react";

interface AIEditInputProps {
  onEdit: (instruction: string) => void;
  onCancel: () => void;
  loading: boolean;
}

export function AIEditInput({ onEdit, onCancel, loading }: AIEditInputProps) {
  const [instruction, setInstruction] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div
      className="p-2 w-64"
      style={{ backgroundColor: "var(--color-bg-secondary)" }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2">
        <Sparkles
          className="h-3.5 w-3.5 flex-shrink-0"
          style={{ color: "var(--color-accent-primary)" }}
        />
        <input
          ref={inputRef}
          type="text"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && instruction.trim() && !loading) {
              onEdit(instruction.trim());
            }
          }}
          placeholder={loading ? "Editing..." : "e.g. make it shorter"}
          disabled={loading}
          className="flex-1 bg-transparent text-xs outline-none"
          style={{ color: "var(--color-text-primary)" }}
        />
        {loading ? (
          <Loader2
            className="h-3.5 w-3.5 animate-spin"
            style={{ color: "var(--color-text-tertiary)" }}
          />
        ) : (
          <>
            <button
              type="button"
              className="p-1 rounded hover:opacity-80 text-xs font-bold"
              style={{ color: "var(--color-accent-primary)" }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => {
                if (instruction.trim() && !loading) {
                  onEdit(instruction.trim());
                }
              }}
            >
              ⏎ Enter
            </button>
            <button
              type="button"
              onClick={onCancel}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1 rounded hover:opacity-80"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
