import { useState, useEffect } from "react";
import { Terminal } from "lucide-react";
import { terminalStore } from "../../stores/terminalStore";
import { getTheme, getThemesByCategory } from "../../data/terminalThemes";
import { TAB_SWITCH_SHORTCUTS } from "../../data/terminalShortcuts";

const ANSI_LABELS = [
  "black", "red", "green", "yellow", "blue", "magenta", "cyan", "white",
  "brightBlack", "brightRed", "brightGreen", "brightYellow",
  "brightBlue", "brightMagenta", "brightCyan", "brightWhite",
];

export function TerminalSettings() {
  const [themeName, setThemeName] = useState(terminalStore.state.themeName);
  const { dark, light } = getThemesByCategory();
  const activeTheme = getTheme(themeName);

  useEffect(() => {
    const unsub = terminalStore.subscribe(() => {
      setThemeName(terminalStore.state.themeName);
    });
    return () => unsub();
  }, []);

  const [shortcutId, setShortcutId] = useState(terminalStore.state.tabSwitchShortcutId);

  useEffect(() => {
    const unsub = terminalStore.subscribe(() => {
      setShortcutId(terminalStore.state.tabSwitchShortcutId);
    });
    return () => unsub();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-lg font-bold mb-1" style={{ color: "var(--color-text-primary)" }}>
        Terminal Settings
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--color-text-tertiary)" }}>
        Configure terminal appearance and behavior
      </p>

      {/* Current theme indicator */}
      <div
        className="mb-6 p-4 rounded-[var(--radius-md)] border-2"
        style={{
          backgroundColor: "var(--color-bg-tertiary)",
          borderColor: "var(--color-border-primary)",
        }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          Current Theme
        </p>
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4" style={{ color: "var(--color-accent-primary)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
            {activeTheme.name}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border-primary)",
            }}
          >
            {activeTheme.category}
          </span>
        </div>
      </div>

      {/* Tab Switching Shortcut */}
      <div
        className="mb-6 p-4 rounded-[var(--radius-md)] border-2"
        style={{
          backgroundColor: "var(--color-bg-tertiary)",
          borderColor: "var(--color-border-primary)",
        }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          Tab Switching Shortcut
        </p>
        <div className="grid grid-cols-1 gap-2">
          {TAB_SWITCH_SHORTCUTS.map((shortcut) => (
            <button
              key={shortcut.id}
              onClick={() => terminalStore.setTabSwitchShortcut(shortcut.id)}
              className="p-2.5 rounded-lg border-2 text-left transition-all hover:opacity-90 text-sm"
              style={{
                backgroundColor:
                  shortcut.id === shortcutId
                    ? "var(--color-accent-primary)"
                    : "var(--color-bg-secondary)",
                color:
                  shortcut.id === shortcutId
                    ? "#FFFFFF"
                    : "var(--color-text-primary)",
                borderColor:
                  shortcut.id === shortcutId
                    ? "var(--color-accent-primary)"
                    : "var(--color-border-primary)",
              }}
            >
              {shortcut.label}
            </button>
          ))}
        </div>
      </div>

      {/* ANSI Color Palette */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
          ANSI Color Palette
        </h2>
        <div className="flex gap-1 flex-wrap">
          {ANSI_LABELS.map((key) => (
            <div
              key={key}
              className="w-6 h-6 rounded border"
              style={{
                backgroundColor: (activeTheme as any)[key],
                borderColor: "var(--color-border-primary)",
              }}
              title={key}
            />
          ))}
        </div>
      </div>

      {/* Dark Themes */}
      <h2 className="text-sm font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
        Dark Themes
      </h2>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {dark.map((theme) => (
          <button
            key={theme.name}
            onClick={() => terminalStore.setTheme(theme.name)}
            className="p-3 rounded-lg border-2 text-left transition-all hover:opacity-90"
            style={{
              backgroundColor: theme.background,
              color: theme.foreground,
              borderColor: theme.name === themeName
                ? "var(--color-accent-primary, #3B82F6)"
                : "var(--color-border-primary)",
            }}
          >
            <p className="text-sm font-medium">{theme.name}</p>
          </button>
        ))}
      </div>

      {/* Light Themes */}
      <h2 className="text-sm font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
        Light Themes
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {light.map((theme) => (
          <button
            key={theme.name}
            onClick={() => terminalStore.setTheme(theme.name)}
            className="p-3 rounded-lg border-2 text-left transition-all hover:opacity-90"
            style={{
              backgroundColor: theme.background,
              color: theme.foreground,
              borderColor: theme.name === themeName
                ? "var(--color-accent-primary, #3B82F6)"
                : "var(--color-border-primary)",
            }}
          >
            <p className="text-sm font-medium">{theme.name}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
