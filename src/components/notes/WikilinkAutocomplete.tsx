import { useState, useEffect, useRef, useCallback } from "react";
import { X, Plus } from "lucide-react";
import { noteStore } from "./noteStore";
import type { Note } from "./Types";

interface WikilinkAutocompleteProps {
  open: boolean;
  search: string;
  position: { top: number; left: number };
  onSelect: (title: string) => void;
  onClose: () => void;
}

export function WikilinkAutocomplete({
  open,
  search,
  position,
  onSelect,
  onClose,
}: WikilinkAutocompleteProps) {
  const [results, setResults] = useState<Array<{ title: string; slug: string }>>(
    []
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const allNotes = noteStore.state.notes;

  useEffect(() => {
    if (!open) return;
    const q = search.toLowerCase().trim();
    const filtered = allNotes
      .filter((n) => n.title.toLowerCase().includes(q))
      .slice(0, 10)
      .map((n) => ({ title: n.title, slug: n.slug }));
    setResults(filtered);
    setSelectedIndex(0);
  }, [search, open, allNotes]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results[selectedIndex]) {
          onSelect(results[selectedIndex].title);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, results, selectedIndex, onSelect, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const item = listRef.current.children[selectedIndex] as HTMLElement;
      if (item) item.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!open || results.length === 0) return null;

  return (
    <div
      className="fixed z-50 w-72 rounded-[var(--radius-md)] border-2 overflow-hidden animate-fadeIn"
      style={{
        top: position.top,
        left: position.left,
        backgroundColor: "var(--color-bg-primary)",
        borderColor: "var(--color-border-primary)",
        boxShadow: "var(--shadow-card)",
        maxHeight: "240px",
      }}
    >
      <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider border-b-2" 
        style={{ color: "var(--color-text-tertiary)", borderColor: "var(--color-border-primary)" }}>
        Link to note
      </div>
      <div ref={listRef} className="overflow-y-auto max-h-[200px] p-1">
        {results.map((note, i) => (
          <button
            key={note.slug}
            onClick={() => onSelect(note.title)}
            onMouseEnter={() => setSelectedIndex(i)}
            className="flex items-center gap-2 w-full px-2.5 py-2 text-sm rounded-[var(--radius-sm)] text-left transition-colors"
            style={{
              backgroundColor:
                i === selectedIndex
                  ? "var(--color-accent-subtle)"
                  : "transparent",
              color:
                i === selectedIndex
                  ? "var(--color-accent-primary)"
                  : "var(--color-text-primary)",
            }}
          >
            <Plus className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
            <span className="truncate">{note.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}