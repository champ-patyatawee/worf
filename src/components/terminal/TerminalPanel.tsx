import { useRef, useEffect, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon } from "@xterm/addon-search";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import "@xterm/xterm/css/xterm.css";
import { X, Plus, Minus, ArrowUp, ArrowDown, Maximize2, Minimize2 } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { terminalStore } from "../../stores/terminalStore";
import { getTheme } from "../../data/terminalThemes";

interface XtermInstance {
  term: Terminal;
  fitAddon: FitAddon;
  searchAddon: SearchAddon;
  container: HTMLDivElement;
}

/** Map of tab ID → xterm instance — each tab gets its own independent instance */
const xtermInstances = new Map<string, XtermInstance>();

interface TerminalOutputPayload {
  tab_id: string;
  data: string;
}

interface TerminalExitedPayload {
  tab_id: string;
  code: number | null;
}

export function TerminalPanel() {
  // ── Debug: log JS errors to temp file ──
  async function logDebug(msg: string) {
    try {
      const now = new Date().toISOString();
      await writeTextFile("/Users/champp/worf-debug.log", `[${now}] ${msg}\n`, { append: true });
    } catch {}
  }

  // ── window.onerror: capture unhandled JS errors ──
  useEffect(() => {
    const orig = window.onerror;
    window.onerror = (msg, url, line, col, err) => {
      logDebug(`JS ERROR: ${msg} at ${url}:${line}:${col} ${err?.stack || ""}`);
      return false;
    };
    return () => { window.onerror = orig; };
  }, []);

  const terminalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [, forceUpdate] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const resizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);


  // Sync with store
  useEffect(() => {
    const unsub = terminalStore.subscribe(() => forceUpdate((n) => n + 1));
    return () => unsub();
  }, []);

  const { tabs, activeTabId, activeTab, isLoading, themeName, terminalHeight, dockPosition, terminalMode } =
    terminalStore.state;
  const dockPosRef = useRef(dockPosition);
  dockPosRef.current = dockPosition;
  const currentTheme = getTheme(themeName);

  // ── 1a. Create/destroy xterm instances as tabs change ──
  useEffect(() => {
    const container = terminalRef.current;
    if (!container) return;

    try {
      // Create instances for NEW tabs
      for (const tab of tabs) {
        if (xtermInstances.has(tab.id)) continue;

        // Create a div for this tab's xterm
        const div = document.createElement("div");
        div.className = "w-full h-full absolute top-0 left-0";
        div.style.display = "block";  // Must be visible for fitAddon.fit() to get correct dimensions
        div.id = `xterm-${tab.id}`;
        container.appendChild(div);

        // Create xterm instance
        const term = new Terminal({
          cursorBlink: true,
          cursorStyle: "block",
          fontSize: terminalStore.fontSize,
          scrollback: 1000,
          fontFamily:
            "'JetBrainsMono Nerd Font', 'FiraCode Nerd Font', 'MesloLGS NF', 'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, 'Courier New', 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Symbols Nerd Font', monospace",
          allowTransparency: true,
          theme: currentTheme,
          allowProposedApi: true,
          letterSpacing: 0.5,
          lineHeight: 1.1,
        });

        const fitAddon = new FitAddon();
        const searchAddon = new SearchAddon();
        const webLinksAddon = new WebLinksAddon();
        term.loadAddon(fitAddon);
        term.loadAddon(searchAddon);
        term.loadAddon(webLinksAddon);
        // Register and activate Unicode 11 width rules for correct emoji/Nerd Font sizing
        logDebug(`about to create Unicode11Addon`);
        const unicode11Addon = new Unicode11Addon();
        logDebug(`about to load unicode11 addon`);
        term.loadAddon(unicode11Addon);
        logDebug(`unicode11 addon loaded successfully`);
        logDebug(`about to activate unicode version 11`);
        try {
          term.unicode.activeVersion = '11';
          logDebug(`unicode version set to: ${term.unicode.activeVersion}`);
        } catch (e) {
          logDebug(`ERROR setting unicode activeVersion: ${e instanceof Error ? e.message : String(e)}`);
          // Don't re-throw - continue with terminal creation even if unicode fails
        }
        logDebug(`about to open xterm on div`);
        term.open(div);
        logDebug(`xterm opened on div`);
        fitAddon.fit();  // Element is visible → correct dimensions ✅

        const dims = fitAddon.proposeDimensions();
        logDebug(`xterm created for tab ${tab.id}: cols=${dims?.cols}, rows=${dims?.rows}`);

        // Now hide if not the active tab (after fitAddon.fit() got correct dimensions)
        if (tab.id !== activeTabId) {
          div.style.display = "none";
        }

        xtermInstances.set(tab.id, { term, fitAddon, searchAddon, container: div });
        logDebug(`instance stored in map for tab ${tab.id}, map size now ${xtermInstances.size}`);

        // Replay any buffered data (only on creation, not on tab switch)
        logDebug(`replaying buffer for tab ${tab.id}: ${tab.buffer.length} chunks`);
        for (const chunk of tab.buffer) {
          term.write(chunk);
        }
        terminalStore.markWritten(tab.id);
      }

      // Destroy instances for REMOVED tabs
      for (const [id, instance] of xtermInstances) {
        if (!tabs.find((t) => t.id === id)) {
          instance.term.dispose();
          instance.container.remove();
          xtermInstances.delete(id);
        }
      }
    } catch (err) {
      logDebug(`ERROR in xterm creation effect: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [tabs.length]);

  // ── 1b. Show/hide xterm instances when switching tabs (replay unwritten buffer) ──
  useEffect(() => {
    for (const [id, instance] of xtermInstances) {
      const becomingActive = id === activeTabId;
      instance.container.style.display = becomingActive ? "block" : "none";
      if (becomingActive) {
        // Replay buffer data that arrived while this tab was inactive
        const tab = terminalStore.tabs.find(t => t.id === id);
        if (tab && tab.buffer.length > tab.writtenIndex) {
          const unwritten = tab.buffer.slice(tab.writtenIndex);
          for (const chunk of unwritten) {
            instance.term.write(chunk);
          }
          terminalStore.markWritten(id);
        }
        setTimeout(async () => {
          instance.fitAddon.fit();
          const dims = instance.fitAddon.proposeDimensions();
          if (dims) {
            await terminalStore.resize(dims.rows, dims.cols);
          }
        }, 50);
      }
    }
  }, [activeTabId]);

  // ── Cleanup xterm instances on unmount ──
  useEffect(() => {
    return () => {
      for (const [, instance] of xtermInstances) {
        instance.term.dispose();
        instance.container.remove();
      }
      xtermInstances.clear();
    };
  }, []);

  // ── 2. Listen for Tauri events ──
  useEffect(() => {
    const unsub1 = listen<TerminalOutputPayload>("terminal-output", (event) => {
      const { tab_id, data } = event.payload;
      terminalStore.handleOutput(tab_id, data);
      // Write to the tab's own xterm instance (not a shared one)
      if (tab_id === terminalStore.activeTabId) {
        const inst = xtermInstances.get(tab_id);
        if (inst) {
          inst.term.write(data);
          terminalStore.markWritten(tab_id);  // track that this chunk was written
        }
      }
    });

    const unsub2 = listen<TerminalExitedPayload>("terminal-exited", (event) => {
      const { tab_id, code } = event.payload;
      terminalStore.handleExited(tab_id, code);
      // Show exit message only if it's the active tab
      if (tab_id === terminalStore.activeTabId) {
        const inst = xtermInstances.get(tab_id);
        if (inst) {
          inst.term.write(
            `\r\n\x1b[31m[Process exited with code ${code ?? "?"}]\x1b[0m\r\n`,
          );
        }
      }
    });

    return () => {
      unsub1.then((fn) => fn());
      unsub2.then((fn) => fn());
    };
  }, []);

  // ── 3. Handle keyboard input ──
  useEffect(() => {
    const inst = activeTabId ? xtermInstances.get(activeTabId) : undefined;
    logDebug(`keyboard effect: activeTabId=${activeTabId}, inst found=${!!inst}, instances in map=${xtermInstances.size}`);
    if (!inst) return;

    const disposable = inst.term.onData((data) => {
      logDebug(`onData fired: data=${JSON.stringify(data)}, isRunning=${terminalStore.activeTab?.isRunning}`);
      const tab = terminalStore.activeTab;
      if (tab?.isRunning) {
        terminalStore.write(data);
      } else if (data === "\r") {
        terminalStore.createTab();
      }
    });
    logDebug(`onData handler registered successfully`);
    return () => {
      logDebug(`disposing onData handler for tab ${activeTabId}`);
      disposable.dispose();
    };
  }, [activeTabId]);

  // ── 5. Auto-resize ──
  useEffect(() => {
    const container = terminalRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      for (const [, inst] of xtermInstances) {
        inst.fitAddon.fit();
      }
      // During drag, don't send resize to backend — handled on mouseup
      if (isDragging.current) return;

      // Debounce: only send resize after 100ms of no resize events
      if (resizeTimer.current) clearTimeout(resizeTimer.current);
      resizeTimer.current = setTimeout(() => {
        (async () => {
          const currentId = terminalStore.activeTabId;
          const activeInst = currentId ? xtermInstances.get(currentId) : undefined;
          if (activeInst) {
            const dims = activeInst.fitAddon.proposeDimensions();
            if (dims) {
              await terminalStore.resize(dims.rows, dims.cols);
            }
          }
        })();
      }, 100);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ── 5b. Re-fit xterm when terminal opens (after slide transition completes) ──
  useEffect(() => {
    if (!terminalStore.isOpen) return;
    const timer = setTimeout(() => {
      const currentId = terminalStore.activeTabId;
          const activeInst = currentId ? xtermInstances.get(currentId) : undefined;
      if (activeInst) {
        activeInst.fitAddon.fit();
        const dims = activeInst.fitAddon.proposeDimensions();
        if (dims) {
          terminalStore.resize(dims.rows, dims.cols);
        }
      }
    }, 250); // slightly longer than CSS transition (200ms)
    return () => clearTimeout(timer);
  }, [terminalStore.isOpen]);

  // ── 9. Keyboard shortcuts for tab management ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Terminal must be open for shortcuts to work
      if (!terminalStore.isOpen) return;

      // ──────────────────────────────────────────
      // Meta (Cmd) shortcuts — APP-LEVEL
      // These don't conflict with shell input on macOS
      // so they work without needing terminal focus
      // ──────────────────────────────────────────
      if (e.metaKey && !e.ctrlKey) {
        // Cmd+T → New Tab
        if (!e.shiftKey && (e.key === "t" || e.key === "T")) {
          e.preventDefault();
          e.stopPropagation();
          terminalStore.createTab();
          return;
        }

        // Cmd+Shift+W → Close Active Tab
        if (e.shiftKey && (e.key === "w" || e.key === "W")) {
          e.preventDefault();
          e.stopPropagation();
          if (terminalStore.activeTabId && terminalStore.tabs.length > 1) {
            terminalStore.closeTab(terminalStore.activeTabId);
          }
          return;
        }

        // Cmd+Shift+1..8 → Go to Tab N
        if (e.shiftKey && e.key >= "1" && e.key <= "8") {
          e.preventDefault();
          e.stopPropagation();
          const idx = parseInt(e.key) - 1;
          const tabs = terminalStore.tabs;
          if (idx < tabs.length) {
            terminalStore.switchTab(tabs[idx].id);
          }
          return;
        }

        // Cmd+Shift+9 → Go to last tab
        if (e.shiftKey && e.key === "9") {
          e.preventDefault();
          e.stopPropagation();
          const tabs = terminalStore.tabs;
          if (tabs.length > 0) {
            terminalStore.switchTab(tabs[tabs.length - 1].id);
          }
          return;
        }

        // Cmd+F → Toggle Search
        if (!e.shiftKey && e.key === "f") {
          e.preventDefault();
          e.stopPropagation();
          setShowSearch((prev) => !prev);
          return;
        }

        // Cmd+= → Zoom In
        if (!e.shiftKey && (e.key === "=" || e.key === "+")) {
          e.preventDefault();
          e.stopPropagation();
          terminalStore.zoomIn();
          return;
        }

        // Cmd+- → Zoom Out
        if (!e.shiftKey && (e.key === "-" || e.key === "_")) {
          e.preventDefault();
          e.stopPropagation();
          terminalStore.zoomOut();
          return;
        }

        // Cmd+0 → Reset Zoom
        if (!e.shiftKey && e.key === "0") {
          e.preventDefault();
          e.stopPropagation();
          terminalStore.zoomReset();
          return;
        }
      }

      // ──────────────────────────────────────────
      // Ctrl shortcuts — SHELL-AWARE
      // These require terminal focus because they
      // could conflict with shell keybindings
      // ──────────────────────────────────────────
      const panel = panelRef.current;
      const isFocused = panel?.contains(document.activeElement) ?? false;
      if (!isFocused) return;

      // Ctrl+Shift+T → New Tab (cross-platform fallback)
      if (e.ctrlKey && e.shiftKey && (e.key === "t" || e.key === "T")) {
        e.preventDefault();
        e.stopPropagation();
        terminalStore.createTab();
        return;
      }

      // Ctrl+Shift+W → Close Active Tab (cross-platform fallback)
      if (e.ctrlKey && e.shiftKey && (e.key === "w" || e.key === "W")) {
        e.preventDefault();
        e.stopPropagation();
        if (terminalStore.activeTabId && terminalStore.tabs.length > 1) {
          terminalStore.closeTab(terminalStore.activeTabId);
        }
        return;
      }

      // Dynamic tab switch shortcut (configurable in Settings)
      const shortcut = terminalStore.tabSwitchShortcut;

      // Next tab
      if (e[shortcut.nextModifier as keyof KeyboardEvent] && e.shiftKey === shortcut.nextShift && e.key === shortcut.nextKey) {
        e.preventDefault();
        e.stopPropagation();
        const tabs = terminalStore.tabs;
        if (tabs.length < 2) return;
        const idx = tabs.findIndex(t => t.id === terminalStore.activeTabId);
        const next = (idx + 1) % tabs.length;
        terminalStore.switchTab(tabs[next].id);
        return;
      }

      // Previous tab
      if (e[shortcut.prevModifier as keyof KeyboardEvent] && e.shiftKey === shortcut.prevShift && e.key === shortcut.prevKey) {
        e.preventDefault();
        e.stopPropagation();
        const tabs = terminalStore.tabs;
        if (tabs.length < 2) return;
        const idx = tabs.findIndex(t => t.id === terminalStore.activeTabId);
        const prev = (idx - 1 + tabs.length) % tabs.length;
        terminalStore.switchTab(tabs[prev].id);
        return;
      }

      // Ctrl+Shift+1..8 → Go to Tab N
      if (e.ctrlKey && e.shiftKey && e.key >= "1" && e.key <= "8") {
        e.preventDefault();
        e.stopPropagation();
        const idx = parseInt(e.key) - 1;
        const tabs = terminalStore.tabs;
        if (idx < tabs.length) {
          terminalStore.switchTab(tabs[idx].id);
        }
        return;
      }

      // Ctrl+Shift+9 → Go to last tab
      if (e.ctrlKey && e.shiftKey && e.key === "9") {
        e.preventDefault();
        e.stopPropagation();
        const tabs = terminalStore.tabs;
        if (tabs.length > 0) {
          terminalStore.switchTab(tabs[tabs.length - 1].id);
        }
        return;
      }

      // Ctrl+F → Toggle Search (when focused)
      if (e.ctrlKey && !e.shiftKey && e.key === "f") {
        e.preventDefault();
        e.stopPropagation();
        setShowSearch((prev) => !prev);
        return;
      }
    };

    // Use capture: true to intercept before xterm.js consumes the event
    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, []);

  // ── 6. Create first tab on mount if open and no tabs ──
  useEffect(() => {
    if (tabs.length === 0 && !isLoading) {
      terminalStore.createTab();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-focus the terminal panel for keyboard shortcuts
  useEffect(() => {
    if (tabs.length > 0) {
      // Small delay to let React finish rendering
      setTimeout(() => panelRef.current?.focus(), 50);
    }
  }, [tabs.length, activeTabId]);

  // ── 7. Update theme reactively ──
  useEffect(() => {
    const theme = getTheme(themeName);
    for (const [, inst] of xtermInstances) {
      inst.term.options.theme = theme;
    }
  }, [themeName]);

  // Update font size reactively
  useEffect(() => {
    for (const [, inst] of xtermInstances) {
      inst.term.options.fontSize = terminalStore.state.fontSize;
      inst.fitAddon.fit();
    }
  }, [terminalStore.state.fontSize]);

  // Auto-focus search input when it opens
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.select();
    }
  }, [showSearch]);

  // ── 8. Global mouse events for drag-resize ──
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = dockPosRef.current === 'bottom'
        ? startY.current - e.clientY   // bottom-docked: drag UP = grow
        : e.clientY - startY.current;  // top-docked: drag DOWN = grow
      terminalStore.setTerminalHeight(Math.round(startHeight.current + delta));
    };
    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setTimeout(() => {
        const id = terminalStore.activeTabId;
        if (id) {
          const inst = xtermInstances.get(id);
          if (inst) {
            inst.fitAddon.fit();
            const dims = inst.fitAddon.proposeDimensions();
            if (dims) {
              terminalStore.resize(dims.rows, dims.cols);
            }
          }
        }
      }, 50);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [terminalHeight, dockPosition]);



  const handleDragStart = (e: React.MouseEvent) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startHeight.current = terminalHeight;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  };

  // Derive the active search addon for the search bar
  const currentId = terminalStore.activeTabId;
          const activeInst = currentId ? xtermInstances.get(currentId) : undefined;

  return (
    <div
      ref={panelRef}
      className="flex flex-col outline-none flex-1"
      tabIndex={0}
      style={{
        boxShadow: terminalMode === 'fullscreen' ? 'none' : "0 -4px 16px rgba(0,0,0,0.15)",
        backgroundColor: "var(--color-bg-primary)",
      }}
    >
      {/* Drag handle — at top when docked to bottom */}
      {terminalMode !== 'fullscreen' && dockPosition === 'bottom' && (
        <div
          onMouseDown={handleDragStart}
          className="flex items-center justify-center h-2 cursor-row-resize select-none flex-shrink-0 hover:opacity-80 transition-opacity"
          style={{ backgroundColor: "var(--color-border-primary)" }}
        >
          <div className="flex items-center gap-1">
            <div className="w-5 h-[2px] rounded-full" style={{ backgroundColor: "#FFFBEB" }} />
            <div className="w-5 h-[2px] rounded-full" style={{ backgroundColor: "#FFFBEB" }} />
            <div className="w-5 h-[2px] rounded-full" style={{ backgroundColor: "#FFFBEB" }} />
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div
        className="flex items-center px-2 py-0 border-b-2 select-none overflow-x-auto scrollbar-none"
        style={{
          backgroundColor: "#FFFBEB",
          borderColor: "var(--color-border-primary)",
          minHeight: "36px",
        }}
      >
        {/* Tab list */}
        <div className="flex items-center gap-0 flex-1">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => terminalStore.switchTab(tab.id)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer
                border-2 rounded-t-md transition-colors whitespace-nowrap
                ${tab.id === activeTabId ? "border-b-0 font-bold" : "border-transparent opacity-60 hover:opacity-90"}
              `}
              style={{
                backgroundColor: tab.id === activeTabId ? "var(--color-bg-secondary)" : "transparent",
                borderColor: tab.id === activeTabId ? "var(--color-border-primary)" : "transparent",
                color: tab.id === activeTabId ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                marginBottom: "-2px",
              }}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tab.isRunning ? "bg-green-500" : "bg-red-500"}`} />
              <span className="truncate max-w-[120px]">{tab.title}</span>
              {/* Close button on tab */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  terminalStore.closeTab(tab.id);
                }}
                className="hover:opacity-70 ml-0.5 flex-shrink-0"
                aria-label={`Close ${tab.title}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* New tab button */}
        <button
          onClick={() => terminalStore.createTab()}
          className="flex items-center justify-center w-7 h-7 rounded hover:opacity-70 transition-opacity flex-shrink-0 ml-1"
          style={{ color: "var(--color-text-secondary)" }}
          aria-label="New terminal tab"
          disabled={isLoading}
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Dock position toggle */}
        <button
          onClick={() => terminalStore.toggleDockPosition()}
          className="flex items-center justify-center w-7 h-7 rounded hover:opacity-70 transition-opacity flex-shrink-0 ml-1"
          style={{ color: "var(--color-text-secondary)" }}
          aria-label={dockPosition === 'bottom' ? 'Move terminal to top' : 'Move terminal to bottom'}
          title={dockPosition === 'bottom' ? 'Dock to top' : 'Dock to bottom'}
        >
          {dockPosition === 'bottom' ? (
            <ArrowUp className="w-4 h-4" />
          ) : (
            <ArrowDown className="w-4 h-4" />
          )}
        </button>

        {/* Mode toggle: overlay ↔ fullscreen */}
        <button
          onClick={() => terminalStore.toggleTerminalMode()}
          className="flex items-center justify-center w-7 h-7 rounded hover:opacity-70 transition-opacity flex-shrink-0 ml-1"
          style={{ color: "var(--color-text-secondary)" }}
          aria-label={terminalMode === 'fullscreen' ? 'Switch to overlay mode' : 'Switch to fullscreen mode'}
          title={terminalMode === 'fullscreen' ? 'Overlay mode' : 'Fullscreen mode'}
        >
          {terminalMode === 'fullscreen' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Minimize terminal panel */}
        <button
          onClick={() => terminalStore.minimize()}
          className="flex items-center justify-center w-7 h-7 rounded hover:opacity-70 transition-opacity flex-shrink-0 ml-1"
          style={{ color: "var(--color-text-secondary)" }}
          aria-label="Minimize terminal"
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* Close terminal panel */}
        <button
          onClick={async () => {
            if (terminalStore.tabs.length > 0) {
              await terminalStore.closeAllConfirmed();
            } else {
              terminalStore.toggle();
            }
          }}
          className="flex items-center justify-center w-7 h-7 rounded hover:opacity-70 transition-opacity flex-shrink-0 ml-1"
          style={{ color: "var(--color-text-secondary)" }}
          aria-label="Close terminal"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 border-b-2"
          style={{
            backgroundColor: "var(--color-bg-tertiary)",
            borderColor: "var(--color-border-primary)",
          }}
        >
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search terminal..."
            className="flex-1 text-xs px-2 py-1 rounded border outline-none"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              borderColor: "var(--color-border-primary)",
              color: "var(--color-text-primary)",
            }}
            onChange={(e) => {
              const val = e.target.value;
              if (val) activeInst?.searchAddon.findNext(val);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const input = e.currentTarget.value;
                if (input) {
                  e.shiftKey
                    ? activeInst?.searchAddon.findPrevious(input)
                    : activeInst?.searchAddon.findNext(input);
                }
              }
              if (e.key === "Escape") {
                setShowSearch(false);
              }
            }}
          />
          <button
            onClick={() => {
              const val = searchInputRef.current?.value;
              if (val) activeInst?.searchAddon.findPrevious(val);
            }}
            className="text-xs px-1.5 py-0.5 rounded border hover:opacity-70"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              borderColor: "var(--color-border-primary)",
              color: "var(--color-text-secondary)",
            }}
            aria-label="Find previous"
          >
            ▲
          </button>
          <button
            onClick={() => {
              const val = searchInputRef.current?.value;
              if (val) activeInst?.searchAddon.findNext(val);
            }}
            className="text-xs px-1.5 py-0.5 rounded border hover:opacity-70"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              borderColor: "var(--color-border-primary)",
              color: "var(--color-text-secondary)",
            }}
            aria-label="Find next"
          >
            ▼
          </button>
          <button
            onClick={() => setShowSearch(false)}
            className="text-xs px-1.5 py-0.5 rounded border hover:opacity-70"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              borderColor: "var(--color-border-primary)",
              color: "var(--color-text-secondary)",
            }}
            aria-label="Close search"
          >
            ✕
          </button>
        </div>
      )}

      {/* xterm container — per-tab divs are appended here by effect #1a */}
      <div
        ref={terminalRef}
        className={`w-full relative overflow-hidden ${terminalMode === 'fullscreen' ? 'flex-1' : ''}`}
        style={{
          height: terminalMode === 'fullscreen' ? 'auto' : `${terminalHeight}px`,
          backgroundColor: currentTheme.background,
          minHeight: terminalMode === 'fullscreen' ? '100px' : undefined,
        }}
      />

      {/* Drag handle — at bottom when docked to top */}
      {terminalMode !== 'fullscreen' && dockPosition === 'top' && (
        <div
          onMouseDown={handleDragStart}
          className="flex items-center justify-center h-2 cursor-row-resize select-none flex-shrink-0 hover:opacity-80 transition-opacity"
          style={{ backgroundColor: "var(--color-border-primary)" }}
        >
          <div className="flex items-center gap-1">
            <div className="w-5 h-[2px] rounded-full" style={{ backgroundColor: "#FFFBEB" }} />
            <div className="w-5 h-[2px] rounded-full" style={{ backgroundColor: "#FFFBEB" }} />
            <div className="w-5 h-[2px] rounded-full" style={{ backgroundColor: "#FFFBEB" }} />
          </div>
        </div>
      )}

      {/* Restart banner — shown when active tab exited */}
      {activeTab && !activeTab.isRunning && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 border-t-2"
          style={{ backgroundColor: "#2D2D3D", borderColor: "#1A1A1A" }}
        >
          <span className="text-xs" style={{ color: "#F38BA8" }}>
            {activeTab.exitCode === 0
              ? "Terminal closed"
              : `Shell exited with code ${activeTab.exitCode ?? "?"}`}
          </span>
          <button
            onClick={() => terminalStore.createTab()}
            className="text-xs font-bold px-2 py-0.5 rounded border"
            style={{
              backgroundColor: "#7C5CFF",
              color: "#FFFFFF",
              borderColor: "#1A1A1A",
            }}
          >
            New Tab
          </button>
        </div>
      )}
    </div>
  );
}
