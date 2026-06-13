import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (must be before imports) ──

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock Tauri event listener
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

// Mock localStorage for theme persistence tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock });

// Import AFTER mocking
import { terminalStore } from "../stores/terminalStore";

// ── Helper ──

async function waitForTabs(length: number) {
  await vi.waitFor(() => {
    expect(terminalStore.tabs.length).toBe(length);
  });
}

// ── Multi-tab management ──

describe("terminal store - tabs management", () => {
  beforeEach(async () => {
    // Close all tabs
    for (const tab of [...terminalStore.tabs]) {
      await terminalStore.closeTab(tab.id);
    }
    // Ensure terminal is closed
    if (terminalStore.isOpen) terminalStore.toggle();
    vi.clearAllMocks();
  });

  it("should start with no tabs and closed", () => {
    expect(terminalStore.isOpen).toBe(false);
    expect(terminalStore.tabs).toHaveLength(0);
    expect(terminalStore.activeTabId).toBeNull();
  });

  it("should create a tab when toggling open", async () => {
    const invoke = (await import("@tauri-apps/api/core")).invoke as ReturnType<typeof vi.fn>;
    invoke.mockResolvedValue({ id: "tab-1", pid: 123, title: "Terminal 1" });

    terminalStore.toggle();
    expect(terminalStore.isOpen).toBe(true);
    await waitForTabs(1);
    expect(terminalStore.tabs[0].id).toBe("tab-1");
    expect(terminalStore.activeTabId).toBe("tab-1");
  });

  it("should minimize and hide the panel", () => {
    terminalStore.toggle(); // open first
    expect(terminalStore.isOpen).toBe(true);

    terminalStore.minimize();
    expect(terminalStore.isOpen).toBe(false);
  });

  it("should create a new tab via createTab", async () => {
    const invoke = (await import("@tauri-apps/api/core")).invoke as ReturnType<typeof vi.fn>;
    invoke.mockResolvedValue({ id: "tab-2", pid: 456, title: "Terminal 2" });

    await terminalStore.createTab();
    expect(terminalStore.tabs).toHaveLength(1);
    expect(terminalStore.tabs[0].pid).toBe(456);
    expect(terminalStore.activeTabId).toBe("tab-2");
  });

  it("should create multiple tabs", async () => {
    const invoke = (await import("@tauri-apps/api/core")).invoke as ReturnType<typeof vi.fn>;
    invoke.mockResolvedValue({ id: "tab-a", pid: 1, title: "Terminal 1" });
    await terminalStore.createTab();

    invoke.mockResolvedValue({ id: "tab-b", pid: 2, title: "Terminal 2" });
    await terminalStore.createTab();

    expect(terminalStore.tabs).toHaveLength(2);
  });

  it("should switch between tabs", async () => {
    const invoke = (await import("@tauri-apps/api/core")).invoke as ReturnType<typeof vi.fn>;
    invoke.mockResolvedValue({ id: "tab-x", pid: 1, title: "Terminal 1" });
    await terminalStore.createTab();

    invoke.mockResolvedValue({ id: "tab-y", pid: 2, title: "Terminal 2" });
    await terminalStore.createTab();

    terminalStore.switchTab("tab-x");
    expect(terminalStore.activeTabId).toBe("tab-x");
  });

  it("should close a tab and remove it", async () => {
    const invoke = (await import("@tauri-apps/api/core")).invoke as ReturnType<typeof vi.fn>;
    invoke.mockResolvedValue({ id: "tab-close", pid: 1, title: "Terminal 1" });
    await terminalStore.createTab();

    await terminalStore.closeTab("tab-close");
    expect(terminalStore.tabs).toHaveLength(0);
    expect(terminalStore.activeTabId).toBeNull();
  });

  it("should call close_terminal_tab when closing", async () => {
    const invoke = (await import("@tauri-apps/api/core")).invoke as ReturnType<typeof vi.fn>;
    invoke.mockResolvedValue({ id: "tab-close2", pid: 1, title: "Terminal 1" });
    await terminalStore.createTab();

    await terminalStore.closeTab("tab-close2");
    expect(invoke).toHaveBeenCalledWith("close_terminal_tab", { tabId: "tab-close2" });
  });

  it("should buffer output for inactive tabs", async () => {
    const invoke = (await import("@tauri-apps/api/core")).invoke as ReturnType<typeof vi.fn>;
    invoke.mockResolvedValue({ id: "tab-a", pid: 1, title: "Terminal 1" });
    await terminalStore.createTab();
    invoke.mockResolvedValue({ id: "tab-b", pid: 2, title: "Terminal 2" });
    await terminalStore.createTab();

    terminalStore.switchTab("tab-a");

    terminalStore.handleOutput("tab-b", "hello\r\n");

    const tabB = terminalStore.tabs.find(t => t.id === "tab-b");
    expect(tabB?.buffer).toContain("hello\r\n");
  });

  it("should buffer output for active tab too", async () => {
    const invoke = (await import("@tauri-apps/api/core")).invoke as ReturnType<typeof vi.fn>;
    invoke.mockResolvedValue({ id: "tab-active", pid: 1, title: "Terminal 1" });
    await terminalStore.createTab();

    terminalStore.handleOutput("tab-active", "some data");

    const tab = terminalStore.tabs[0];
    expect(tab?.buffer).toHaveLength(1);
    expect(tab?.buffer[0]).toBe("some data");
  });

  it("should mark tab as exited on handleExited", async () => {
    const invoke = (await import("@tauri-apps/api/core")).invoke as ReturnType<typeof vi.fn>;
    invoke.mockResolvedValue({ id: "tab-exit", pid: 1, title: "Terminal 1" });
    await terminalStore.createTab();

    terminalStore.handleExited("tab-exit", 0);

    const tab = terminalStore.tabs[0];
    expect(tab?.isRunning).toBe(false);
    expect(tab?.exitCode).toBe(0);
  });

  it("should close terminal panel when last tab is closed", async () => {
    const invoke = (await import("@tauri-apps/api/core")).invoke as ReturnType<typeof vi.fn>;
    invoke.mockResolvedValue({ id: "tab-last", pid: 1, title: "Terminal 1" });
    terminalStore.toggle();
    await waitForTabs(1);

    await terminalStore.closeTab(terminalStore.tabs[0].id);
    expect(terminalStore.isOpen).toBe(false);
  });
});

// ── Theme support tests ──

describe("terminal theme support", () => {
  it("should default to Catppuccin Mocha theme", () => {
    expect(terminalStore.state.themeName).toBe("Catppuccin Mocha");
  });

  it("should change theme via setTheme", () => {
    terminalStore.setTheme("Dracula");
    expect(terminalStore.state.themeName).toBe("Dracula");
    terminalStore.setTheme("Catppuccin Mocha");
  });

  it("should persist theme to localStorage", () => {
    terminalStore.setTheme("Nord");
    expect(localStorage.getItem("terminal-theme-name")).toBe("Nord");
    terminalStore.setTheme("Catppuccin Mocha");
  });

  it("should notify listeners on theme change", () => {
    const listener = vi.fn();
    const unsub = terminalStore.subscribe(listener);
    terminalStore.setTheme("Solarized Dark");
    expect(listener).toHaveBeenCalled();
    terminalStore.setTheme("Catppuccin Mocha");
    unsub();
  });
});

// ── Terminal height / resizable ──

describe("terminal height", () => {
  it("should default to 250px", () => {
    expect(terminalStore.state.terminalHeight).toBe(250);
  });

  it("should update height via setTerminalHeight", () => {
    terminalStore.setTerminalHeight(400);
    expect(terminalStore.state.terminalHeight).toBe(400);
    terminalStore.setTerminalHeight(250);
  });

  it("should persist height to localStorage", () => {
    terminalStore.setTerminalHeight(350);
    expect(localStorage.setItem).toHaveBeenCalledWith("terminal-height", "350");
    terminalStore.setTerminalHeight(250);
  });

  it("should enforce minimum height of 100px", () => {
    terminalStore.setTerminalHeight(50);
    expect(terminalStore.state.terminalHeight).toBe(100);
  });

  it("should enforce maximum height of 95% viewport", () => {
    const max = Math.floor(window.innerHeight * 0.95);
    terminalStore.setTerminalHeight(99999);
    expect(terminalStore.state.terminalHeight).toBe(max);
    terminalStore.setTerminalHeight(250);
  });

  it("should notify listeners on height change", () => {
    const listener = vi.fn();
    const unsub = terminalStore.subscribe(listener);
    terminalStore.setTerminalHeight(300);
    expect(listener).toHaveBeenCalled();
    unsub();
    terminalStore.setTerminalHeight(250);
  });
});

// ── Dock position ──

describe("dockPosition", () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset dockPosition to default via store
    terminalStore.setDockPosition("bottom");
    vi.clearAllMocks();
  });

  it("should default to 'bottom'", () => {
    // Create a fresh store reference — default value in module is 'bottom'
    expect(terminalStore.state.dockPosition).toBe("bottom");
  });

  it("should update to 'top' via setDockPosition", () => {
    terminalStore.setDockPosition("top");
    expect(terminalStore.state.dockPosition).toBe("top");
  });

  it("should update to 'bottom' via setDockPosition", () => {
    terminalStore.setDockPosition("top");
    terminalStore.setDockPosition("bottom");
    expect(terminalStore.state.dockPosition).toBe("bottom");
  });

  it("toggleDockPosition should flip from 'bottom' to 'top'", () => {
    terminalStore.toggleDockPosition();
    expect(terminalStore.state.dockPosition).toBe("top");
  });

  it("toggleDockPosition should flip back to 'bottom'", () => {
    terminalStore.toggleDockPosition(); // bottom → top
    terminalStore.toggleDockPosition(); // top → bottom
    expect(terminalStore.state.dockPosition).toBe("bottom");
  });

  it("should persist dockPosition to localStorage", () => {
    terminalStore.setDockPosition("top");
    expect(localStorage.getItem("terminal-dock-position")).toBe("top");
  });

  it("state getter should return correct dockPosition", () => {
    expect(terminalStore.state.dockPosition).toBe("bottom");
    terminalStore.setDockPosition("top");
    expect(terminalStore.state.dockPosition).toBe("top");
  });

  it("should notify listeners on dockPosition change", () => {
    const listener = vi.fn();
    const unsub = terminalStore.subscribe(listener);
    terminalStore.setDockPosition("top");
    expect(listener).toHaveBeenCalled();
    unsub();
  });
});

// ── Terminal Mode (overlay / fullscreen) ──

describe("terminalMode", () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset terminalMode to default
    terminalStore.setTerminalMode("overlay");
    // Ensure terminal is closed
    if (terminalStore.isOpen) terminalStore.minimize();
    vi.clearAllMocks();
  });

  it("should default to 'overlay'", () => {
    expect(terminalStore.state.terminalMode).toBe("overlay");
  });

  it("setTerminalMode('fullscreen') should set terminalMode to 'fullscreen'", () => {
    terminalStore.setTerminalMode("fullscreen");
    expect(terminalStore.state.terminalMode).toBe("fullscreen");
  });

  it("setTerminalMode('overlay') should set terminalMode to 'overlay'", () => {
    terminalStore.setTerminalMode("fullscreen");
    terminalStore.setTerminalMode("overlay");
    expect(terminalStore.state.terminalMode).toBe("overlay");
  });

  it("toggleTerminalMode() should flip between 'overlay' and 'fullscreen'", () => {
    terminalStore.toggleTerminalMode();
    expect(terminalStore.state.terminalMode).toBe("fullscreen");
    terminalStore.toggleTerminalMode();
    expect(terminalStore.state.terminalMode).toBe("overlay");
  });

  it("setTerminalMode('fullscreen') opens terminal", () => {
    expect(terminalStore.isOpen).toBe(false);
    terminalStore.setTerminalMode("fullscreen");
    expect(terminalStore.isOpen).toBe(true);
  });

  it("setTerminalMode('overlay') does NOT close terminal", () => {
    terminalStore.setTerminalMode("fullscreen");
    expect(terminalStore.isOpen).toBe(true);
    terminalStore.setTerminalMode("overlay");
    expect(terminalStore.isOpen).toBe(true);
  });

  it("should persist terminalMode to localStorage", () => {
    terminalStore.setTerminalMode("fullscreen");
    expect(localStorage.getItem("terminal-mode")).toBe("fullscreen");
  });

  it("state getter should return correct terminalMode", () => {
    expect(terminalStore.state.terminalMode).toBe("overlay");
    terminalStore.setTerminalMode("fullscreen");
    expect(terminalStore.state.terminalMode).toBe("fullscreen");
  });

  it("should notify listeners on terminalMode change", () => {
    const listener = vi.fn();
    const unsub = terminalStore.subscribe(listener);
    terminalStore.setTerminalMode("fullscreen");
    expect(listener).toHaveBeenCalled();
    unsub();
  });
});
