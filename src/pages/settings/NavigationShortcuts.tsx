import { useState, useEffect } from "react";
import { LayoutDashboard, StickyNote, Columns3, Bot, Terminal, Settings } from "lucide-react";
import { navigationShortcutStore } from "../../stores/navigationShortcutStore";
import { KeyRecorder } from "../../components/common/KeyRecorder";
import type { NavigationShortcut } from "../../types/navigation";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  dashboard: LayoutDashboard,
  notes: StickyNote,
  kanban: Columns3,
  "ai-chat": Bot,
  terminal: Terminal,
  settings: Settings,
};

export function NavigationShortcuts() {
  const [, forceUpdate] = useState(0);
  const shortcuts = navigationShortcutStore.shortcuts;

  useEffect(() => {
    const unsub = navigationShortcutStore.subscribe(() => forceUpdate(n => n + 1));
    return () => unsub();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-lg font-bold mb-1" style={{ color: "var(--color-text-primary)" }}>
        Navigation Shortcuts
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--color-text-tertiary)" }}>
        Set keyboard shortcuts to quickly switch between pages
      </p>

      <div
        className="rounded-[var(--radius-lg)] border-2 overflow-hidden max-w-xl"
        style={{
          backgroundColor: "var(--color-bg-primary)",
          borderColor: "var(--color-border-primary)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {shortcuts.map((shortcut) => {
          const Icon = ICON_MAP[shortcut.id];
          return (
            <div
              key={shortcut.id}
              className="flex items-center justify-between px-4 py-3 border-b-2 last:border-b-0"
              style={{ borderColor: "var(--color-border-primary)" }}
            >
              <div className="flex items-center gap-3">
                {Icon && <Icon className="w-4 h-4" style={{ color: "var(--color-text-secondary)" }} />}
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {shortcut.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <KeyRecorder
                  shortcut={shortcut}
                  onRecord={(updates) => navigationShortcutStore.updateShortcut(shortcut.id, updates)}
                />
                <button
                  onClick={() => navigationShortcutStore.updateShortcut(shortcut.id, { key: null, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false })}
                  className="p-1 rounded hover:opacity-70 transition-opacity"
                  style={{ color: "var(--color-text-tertiary)" }}
                  aria-label={`Disable shortcut for ${shortcut.label}`}
                  title="Disable"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => navigationShortcutStore.resetToDefaults()}
        className="mt-4 px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] border-2 transition-all"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          borderColor: "var(--color-border-primary)",
          color: "var(--color-text-secondary)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        Reset to Defaults
      </button>
    </div>
  );
}
