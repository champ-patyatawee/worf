import type { NavigationShortcut } from "../types/navigation";

export const DEFAULT_NAV_SHORTCUTS: NavigationShortcut[] = [
  { id: "dashboard", label: "Dashboard", path: "/",        key: "1", ctrlKey: true, shiftKey: false, altKey: false, metaKey: false },
  { id: "notes",     label: "Notes",     path: "/notes",    key: "2", ctrlKey: true, shiftKey: false, altKey: false, metaKey: false },
  { id: "projects",  label: "Projects",  path: "/project",  key: "3", ctrlKey: true, shiftKey: false, altKey: false, metaKey: false },
  { id: "ai-chat",   label: "AI Chat",   path: "/ai-chat",  key: "4", ctrlKey: true, shiftKey: false, altKey: false, metaKey: false },
  { id: "terminal",  label: "Terminal",  path: null,        key: "5", ctrlKey: true, shiftKey: false, altKey: false, metaKey: false },
  { id: "settings",  label: "Settings",  path: "/settings/ai", key: "6", ctrlKey: true, shiftKey: false, altKey: false, metaKey: false },
];

export function getDefaultNavShortcuts(): NavigationShortcut[] {
  return DEFAULT_NAV_SHORTCUTS.map(s => ({ ...s })); // deep copy
}

export function formatShortcut(s: NavigationShortcut): string {
  if (!s.key) return "\u2014";
  const parts: string[] = [];
  if (s.ctrlKey) parts.push("Ctrl");
  if (s.shiftKey) parts.push("Shift");
  if (s.altKey) parts.push("Alt");
  if (s.metaKey) parts.push("Cmd");
  parts.push(s.key.length === 1 ? s.key.toUpperCase() : s.key);
  return parts.join("+");
}

export function shortcutFromEvent(e: KeyboardEvent): { key: string; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; metaKey: boolean } {
  return {
    key: e.key,
    ctrlKey: e.ctrlKey,
    shiftKey: e.shiftKey,
    altKey: e.altKey,
    metaKey: e.metaKey,
  };
}

export function shortcutsMatch(a: NavigationShortcut, b: { key: string; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; metaKey: boolean }): boolean {
  return a.key === b.key
    && a.ctrlKey === b.ctrlKey
    && a.shiftKey === b.shiftKey
    && a.altKey === b.altKey
    && a.metaKey === b.metaKey;
}
