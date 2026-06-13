import type { NavigationShortcut } from "../types/navigation";
import { getDefaultNavShortcuts, shortcutsMatch, shortcutFromEvent } from "../data/navigationShortcuts";

type Listener = () => void;
const listeners = new Set<Listener>();

let shortcuts: NavigationShortcut[] = loadFromStorage();

function loadFromStorage(): NavigationShortcut[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem("nav-shortcuts") : null;
    if (raw) return JSON.parse(raw) as NavigationShortcut[];
  } catch {
    // ignore parse errors
  }
  return getDefaultNavShortcuts();
}

function save() {
  localStorage.setItem("nav-shortcuts", JSON.stringify(shortcuts));
}

function emit() { listeners.forEach(l => l()); }

export const navigationShortcutStore = {
  subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; },

  get shortcuts() { return shortcuts; },

  updateShortcut(id: string, updates: Partial<NavigationShortcut>) {
    shortcuts = shortcuts.map(s => s.id === id ? { ...s, ...updates } : s);
    save();
    emit();
  },

  resetToDefaults() {
    shortcuts = getDefaultNavShortcuts();
    save();
    emit();
  },

  matchShortcut(e: KeyboardEvent): NavigationShortcut | undefined {
    return shortcuts.find(s => s.key && shortcutsMatch(s, shortcutFromEvent(e)));
  },
};
