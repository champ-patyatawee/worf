import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Loader2 } from "lucide-react";

interface GenerateInputProps {
  onGenerate: (prompt: string) => void;
  onCancel: () => void;
  loading: boolean;
  error?: string;
}

export function GenerateInput({
  onGenerate,
  onCancel,
  loading,
  error,
}: GenerateInputProps) {
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !loading) {
      onGenerate(prompt.trim());
    }
  };

  return (
    <div
      className="rounded-[var(--radius-lg)] border-2 p-3 w-80"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        borderColor: "var(--color-border-primary)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Sparkles
          className="h-4 w-4 flex-shrink-0"
          style={{ color: "var(--color-accent-primary)" }}
        />
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={loading ? "Generating..." : "What should I write?"}
          disabled={loading}
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: "var(--color-text-primary)" }}
        />
        {loading ? (
          <Loader2
            className="h-4 w-4 animate-spin"
            style={{ color: "var(--color-text-tertiary)" }}
          />
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded hover:opacity-80"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>
      {error && (
        <div
          className="mt-2 text-xs pt-2 border-t"
          style={{
            color: "var(--color-error)",
            borderColor: "var(--color-border-primary)",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
