import { useState, useRef, useEffect, useCallback } from "react";
import type { NavigationShortcut } from "../../types/navigation";
import { formatShortcut } from "../../data/navigationShortcuts";

interface KeyRecorderProps {
  shortcut: NavigationShortcut;
  onRecord: (updates: Partial<NavigationShortcut>) => void;
  disabled?: boolean;
}

export function KeyRecorder({ shortcut, onRecord, disabled }: KeyRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === "Escape") {
      setIsRecording(false);
      return;
    }

    // Ignore modifier-only presses
    if (e.key === "Control" || e.key === "Shift" || e.key === "Alt" || e.key === "Meta") return;

    onRecord({
      key: e.key,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
    });
    setIsRecording(false);
  }, [onRecord]);

  useEffect(() => {
    if (isRecording) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isRecording, handleKeyDown]);

  const display = formatShortcut(shortcut);

  return (
    <button
      ref={btnRef}
      onClick={() => { if (!disabled) setIsRecording(true); }}
      className={`px-3 py-1.5 text-xs font-mono font-bold rounded-[var(--radius-md)] border-2 transition-all min-w-[100px] text-center ${
        isRecording ? "animate-pulse" : ""
      }`}
      style={{
        backgroundColor: isRecording ? "var(--color-accent-primary)" : "var(--color-bg-secondary)",
        color: isRecording ? "#FFFFFF" : "var(--color-text-primary)",
        borderColor: isRecording ? "var(--color-accent-primary)" : "var(--color-border-primary)",
        boxShadow: isRecording ? "0 0 0 2px var(--color-accent-primary)" : "var(--shadow-sm)",
      }}
      disabled={disabled}
      aria-label={isRecording ? "Press a key combination" : `Current shortcut: ${display}. Click to change.`}
    >
      {isRecording ? "Press key..." : display}
    </button>
  );
}
