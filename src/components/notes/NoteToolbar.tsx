import { Edit3, Eye, Columns } from "lucide-react";
import type { EditorMode } from "./Types";

interface NoteToolbarProps {
  mode: EditorMode;
  onChangeMode: (mode: EditorMode) => void;
  saving: boolean;
  lastSaved: Date | null;
}

export function NoteToolbar({
  mode,
  onChangeMode,
  saving,
  lastSaved,
}: NoteToolbarProps) {
  const modes: Array<{ id: EditorMode; icon: typeof Edit3; label: string }> = [
    { id: "edit", icon: Edit3, label: "Edit" },
    { id: "preview", icon: Eye, label: "Preview" },
    { id: "split", icon: Columns, label: "Split" },
  ];

  return (
    <div
      className="flex items-center justify-between px-4 py-1.5 border-b-2 gap-2"
      style={{
        backgroundColor: "var(--color-bg-primary)",
        borderColor: "var(--color-border-primary)",
      }}
    >
      {/* Mode tabs */}
      <div className="flex items-center gap-0.5">
        {modes.map((m) => {
          const isActive = mode === m.id;
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              onClick={() => onChangeMode(m.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-[var(--radius-sm)] transition-all border-2"
              style={{
                backgroundColor: isActive
                  ? "var(--color-accent-primary)"
                  : "transparent",
                color: isActive
                  ? "#FFFFFF"
                  : "var(--color-text-tertiary)",
                borderColor: isActive
                  ? "var(--color-border-primary)"
                  : "transparent",
                boxShadow: isActive ? "var(--shadow-sm)" : undefined,
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-1">
        {/* Save status */}
        {saving && (
          <span
            className="text-[11px] font-mono animate-pulse"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Saving...
          </span>
        )}
        {!saving && lastSaved && (
          <span
            className="text-[11px] font-mono"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Saved
          </span>
        )}

        
      </div>
    </div>
  );
}