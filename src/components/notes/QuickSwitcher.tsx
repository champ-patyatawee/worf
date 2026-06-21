import { Search, Plus, Loader2 } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { noteStore } from "./noteStore";
import type { SearchResult } from "./Types";

export function QuickSwitcher() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Listen for global shortcut
  useEffect(() => {
    const handleOpen = () => {
      setOpen(true);
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "p" || e.key === "k")) {
        e.preventDefault();
        handleOpen();
      }
    };
    window.addEventListener("open-quick-switcher", handleOpen);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("open-quick-switcher", handleOpen);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceTimer.current = setTimeout(async () => {
      const res = await noteStore.searchNotes(query);
      setResults(res || []);
      setSelectedIndex(0);
      setLoading(false);
    }, 200);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  const handleSelect = useCallback(
    (slug: string) => {
      setOpen(false);
      navigate(`/notes/${slug}`);
    },
    [navigate]
  );

  const handleCreateNew = useCallback(async () => {
    setOpen(false);
    const note = await noteStore.createNote(query);
    if (note) navigate(`/notes/${note.slug}`);
  }, [query, navigate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex].slug);
        } else if (query.trim()) {
          handleCreateNew();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    },
    [results, selectedIndex, handleSelect, handleCreateNew, query]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      style={{ backgroundColor: "var(--color-bg-overlay)" }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-[var(--radius-lg)] border-2 overflow-hidden animate-scaleIn"
        style={{
          backgroundColor: "var(--color-bg-primary)",
          borderColor: "var(--color-border-primary)",
          boxShadow: "var(--shadow-modal)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b-2"
          style={{ borderColor: "var(--color-border-primary)" }}
        >
          <Search
            className="w-5 h-5 flex-shrink-0"
            style={{ color: "var(--color-text-tertiary)" }}
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search notes..."
            className="flex-1 bg-transparent outline-none text-base"
            style={{ color: "var(--color-text-primary)" }}
          />
          {loading && (
            <Loader2
              className="w-4 h-4 animate-spin"
              style={{ color: "var(--color-text-tertiary)" }}
            />
          )}
          <kbd
            className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
            style={{
              color: "var(--color-text-tertiary)",
              borderColor: "var(--color-border-secondary)",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length > 0 ? (
            <div className="space-y-0.5">
              {results.map((result, i) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result.slug)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[var(--radius-md)] text-left transition-colors"
                  style={{
                    backgroundColor:
                      i === selectedIndex
                        ? "var(--color-bg-hover)"
                        : "transparent",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-sm font-medium truncate"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {result.title || "Untitled"}
                      </span>
                      {result.tags && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full border flex-shrink-0"
                          style={{
                            color: "var(--color-text-tertiary)",
                            borderColor: "var(--color-border-secondary)",
                          }}
                        >
                          #{result.tags.split(",")[0].trim()}
                        </span>
                      )}
                    </div>
                    {result.snippet && (
                      <p
                        className="text-xs mt-0.5 line-clamp-1"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        {result.snippet}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : query.trim() && !loading ? (
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 w-full px-3 py-3 rounded-[var(--radius-md)] text-sm text-left transition-colors hover:bg-[var(--color-bg-hover)]"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <Plus className="w-4 h-4" />
              Create note "{query}"
            </button>
          ) : !query.trim() ? (
            <p
              className="text-sm text-center py-6"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Start typing to search notes
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}