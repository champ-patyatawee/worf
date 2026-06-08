import { invoke } from "@tauri-apps/api/core";
import { confirm } from "@tauri-apps/plugin-dialog";
import { DEFAULT_THEME } from "../data/terminalThemes";
import { DEFAULT_SHORTCUT_ID, getTabSwitchShortcut } from "../data/terminalShortcuts";
import type { TabSwitchShortcut } from "../types/terminal";

// ── Types ──

export interface TerminalTab {
  id: string;
  pid: number;
  title: string;
  buffer: string[];            // accumulated output for replay on tab switch
  writtenIndex: number;        // how many buffer chunks have been written to xterm
  isRunning: boolean;
  exitCode: number | null;
}

// ── Store state ──

type Listener = () => void;
const listeners = new Set<Listener>();

let isOpen = false;
let tabs: TerminalTab[] = [];
let activeTabId: string | null = null;
let isLoading = false;
let error: string | null = null;
let themeName: string =
  (typeof localStorage !== "undefined"
    ? localStorage.getItem("terminal-theme-name")
    : null) || DEFAULT_THEME;
let terminalHeight: number =
  Number(
    typeof localStorage !== "undefined"
      ? localStorage.getItem("terminal-height")
      : null
  ) || 250;
let fontSize: number =
  Number(
    typeof localStorage !== "undefined"
      ? localStorage.getItem("terminal-font-size")
      : null
  ) || 13;
let tabCounter = 0;
let dockPosition: 'bottom' | 'top' =
  (typeof localStorage !== "undefined"
    ? (localStorage.getItem("terminal-dock-position") as 'bottom' | 'top' | null)
    : null) || 'bottom';
let terminalMode: 'overlay' | 'fullscreen' =
  (typeof localStorage !== "undefined"
    ? (localStorage.getItem("terminal-mode") as 'overlay' | 'fullscreen' | null)
    : null) || 'overlay';
let tabSwitchShortcutId: string =
  (typeof localStorage !== "undefined"
    ? localStorage.getItem("terminal-tab-switch-shortcut")
    : null) || DEFAULT_SHORTCUT_ID;

function emit() { listeners.forEach((l) => l()); }
function subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }
function getSnapshot() { return {}; }

// ── Getters ──

function getActiveTab(): TerminalTab | undefined {
  return tabs.find((t) => t.id === activeTabId);
}

export const terminalStore = {
  subscribe,
  getSnapshot,

  get isOpen() { return isOpen; },
  get tabs() { return tabs; },
  get activeTabId() { return activeTabId; },
  get activeTab() { return getActiveTab(); },
  get isLoading() { return isLoading; },
  get error() { return error; },
  get themeName() { return themeName; },
  get terminalHeight() { return terminalHeight; },
  get fontSize() { return fontSize; },
  get dockPosition() { return dockPosition; },
  get terminalMode() { return terminalMode; },
  get tabSwitchShortcutId() { return tabSwitchShortcutId; },
  get tabSwitchShortcut() { return getTabSwitchShortcut(tabSwitchShortcutId); },

  get state() {
    return {
      isOpen,
      tabs,
      activeTabId,
      activeTab: getActiveTab(),
      isLoading,
      error,
      themeName,
      terminalHeight,
      fontSize,
      dockPosition,
      terminalMode,
      tabSwitchShortcutId,
    };
  },

  // ── Tab management ──

  toggle() {
    isOpen = !isOpen;
    emit();
    if (isOpen && tabs.length === 0) {
      this.createTab();
    }
  },

  // Minimize hides the panel but keeps all tabs/sessions alive
  minimize() {
    isOpen = false;
    emit();
  },

  // Close all terminal sessions with confirmation
  async closeAllConfirmed() {
    const confirmed = await confirm(
      `Close all ${tabs.length} terminal session${tabs.length !== 1 ? "s" : ""}?`,
      {
        title: "Terminal",
        kind: "warning",
        okLabel: "Close Sessions",
        cancelLabel: "Cancel",
      }
    );
    if (!confirmed) return;

    // Close each tab (kills shell process)
    for (const tab of tabs) {
      try {
        await invoke("close_terminal_tab", { tabId: tab.id });
      } catch {
        // already dead
      }
    }

    // Reset state
    tabs = [];
    activeTabId = null;
    isOpen = false;
    isLoading = false;
    error = null;
    emit();
  },

  async createTab() {
    isLoading = true;
    error = null;
    emit();
    try {
      const result = await invoke<TerminalTab>("create_terminal_tab");
      tabCounter++;
      const tab: TerminalTab = {
        id: result.id,
        pid: result.pid,
        title: `Terminal ${tabCounter}`,
        buffer: [],
        writtenIndex: 0,
        isRunning: true,
        exitCode: null,
      };
      tabs = [...tabs, tab];
      activeTabId = tab.id;
      isLoading = false;
      emit();
    } catch (e: any) {
      error = e.message ?? String(e);
      isLoading = false;
      emit();
    }
  },

  switchTab(id: string) {
    if (id === activeTabId) return;
    activeTabId = id;
    emit();
  },

  markWritten(tabId: string) {
    tabs = tabs.map((t) =>
      t.id === tabId ? { ...t, writtenIndex: t.buffer.length } : t
    );
  },

  async closeTab(id: string) {
    try {
      await invoke("close_terminal_tab", { tabId: id });
    } catch {
      // already dead
    }
    tabs = tabs.filter((t) => t.id !== id);
    if (activeTabId === id) {
      activeTabId = tabs.length > 0 ? tabs[tabs.length - 1].id : null;
    }
    if (tabs.length === 0) {
      isOpen = false;
    }
    emit();
  },

  // ── I/O ──

  async write(data: string) {
    const tab = getActiveTab();
    if (!tab) return;
    try {
      await invoke("terminal_write", { tabId: tab.id, data });
    } catch (e: any) {
      error = e.message ?? String(e);
      emit();
    }
  },

  async resize(rows: number, cols: number) {
    const tab = getActiveTab();
    if (!tab) return;
    try {
      await invoke("resize_terminal", { tabId: tab.id, rows, cols });
    } catch {
      // non-critical
    }
  },

  // ── Event handlers (called from TerminalPanel) ──

  handleOutput(tabId: string, data: string) {
    const wasInactive = tabId !== activeTabId;
    tabs = tabs.map((t) => {
      if (t.id !== tabId) return t;
      return { ...t, buffer: [...t.buffer, data] };
    });
    if (wasInactive) emit();
  },

  handleExited(tabId: string, code: number | null) {
    tabs = tabs.map((t) =>
      t.id === tabId ? { ...t, isRunning: false, exitCode: code } : t
    );
    emit();
  },

  // ── Tab operations ──

  closeActiveTab() {
    if (activeTabId) this.closeTab(activeTabId);
  },

  // ── Settings ──

  setTheme(name: string) {
    themeName = name;
    localStorage.setItem("terminal-theme-name", name);
    emit();
  },

  setTerminalHeight(height: number) {
    const min = 100;
    const max = Math.floor(window.innerHeight * 0.95);
    terminalHeight = Math.max(min, Math.min(max, height));
    localStorage.setItem("terminal-height", String(terminalHeight));
    emit();
  },

  // ── Font size ──

  setFontSize(size: number) {
    fontSize = Math.max(9, Math.min(32, size));
    localStorage.setItem("terminal-font-size", String(fontSize));
    emit();
  },

  zoomIn() {
    this.setFontSize(fontSize + 1);
  },

  zoomOut() {
    this.setFontSize(fontSize - 1);
  },

  zoomReset() {
    this.setFontSize(13);
  },

  setDockPosition(pos: 'bottom' | 'top') {
    dockPosition = pos;
    localStorage.setItem("terminal-dock-position", pos);
    emit();
  },

  toggleDockPosition() {
    const newPos = dockPosition === 'bottom' ? 'top' : 'bottom';
    dockPosition = newPos;
    localStorage.setItem("terminal-dock-position", newPos);
    emit();
  },

  // ── Terminal Mode ──

  setTerminalMode(mode: 'overlay' | 'fullscreen') {
    terminalMode = mode;
    localStorage.setItem("terminal-mode", mode);
    if (mode === 'fullscreen') {
      isOpen = true; // auto-open when switching to fullscreen
    }
    emit();
  },

  toggleTerminalMode() {
    this.setTerminalMode(terminalMode === 'overlay' ? 'fullscreen' : 'overlay');
  },

  setTabSwitchShortcut(id: string) {
    tabSwitchShortcutId = id;
    localStorage.setItem("terminal-tab-switch-shortcut", id);
    emit();
  },
};
