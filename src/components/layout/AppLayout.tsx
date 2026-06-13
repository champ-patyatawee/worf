import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { IconSidebar } from "./IconSidebar";
import { ChatSessionSidebar } from "../chat/ChatSessionSidebar";
import { TerminalPanel } from "../terminal/TerminalPanel";
import { terminalStore } from "../../stores/terminalStore";
import { navigationShortcutStore } from "../../stores/navigationShortcutStore";

export function AppLayout() {
  const location = useLocation();
  const path = location.pathname;
  const isAiChatTab = path.startsWith("/ai-chat");
  const navigate = useNavigate();
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const unsub = terminalStore.subscribe(() => forceUpdate((n) => n + 1));
    return () => unsub();
  }, []);

  // Global keyboard shortcut: Ctrl+` or Cmd+` to toggle terminal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+` or Cmd+` (backtick) toggles terminal
      if ((e.ctrlKey || e.metaKey) && e.key === "`") {
        e.preventDefault();
        e.stopPropagation();
        terminalStore.toggle();
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Global keyboard shortcuts for page navigation
  useEffect(() => {
    const handleNavShortcuts = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea/contenteditable
      const tag = (e.target as HTMLElement)?.tagName;
      const isEditable = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if (isEditable) return;

      const match = navigationShortcutStore.matchShortcut(e);
      if (!match) return;

      e.preventDefault();
      e.stopPropagation();

      if (match.id === "terminal") {
        terminalStore.toggle();
      } else if (match.path) {
        navigate(match.path);
      }
    };

    document.addEventListener("keydown", handleNavShortcuts);
    return () => document.removeEventListener("keydown", handleNavShortcuts);
  }, [navigate]);

  // Terminal fullscreen mode — terminal replaces content area when open, user can switch pages
  if (terminalStore.state.terminalMode === 'fullscreen') {
    return (
      <div className="flex flex-col h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="flex flex-1 overflow-hidden">
          <IconSidebar />
          {terminalStore.state.isOpen ? (
            // Terminal fills the content area (replaces Outlet)
            <div className="flex-1 flex flex-col overflow-hidden">
              <TerminalPanel />
            </div>
          ) : (
            // Normal app content
            <>
              {isAiChatTab && <ChatSessionSidebar />}
              <main
                className="flex-1 flex flex-col overflow-hidden"
                style={{ backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <Outlet />
              </main>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ backgroundColor: "var(--color-bg-primary)" }}
    >
      <div className="flex flex-1 overflow-hidden">
        <IconSidebar />
        {isAiChatTab && <ChatSessionSidebar />}
        <main
          className="flex-1 flex flex-col overflow-hidden"
          style={{ backgroundColor: "var(--color-bg-secondary)" }}
        >
          <Outlet />
        </main>
      </div>
      {/* Terminal as fixed overlay — slides from bottom or top based on dockPosition */}
      <div
        className={`fixed ${terminalStore.state.dockPosition === 'top' ? 'top-0' : 'bottom-0'} right-0 z-50 transition-transform duration-200 ease-out`}
        style={{
          left: "64px",
          transform: terminalStore.state.isOpen
            ? "translateY(0)"
            : terminalStore.state.dockPosition === 'top'
              ? "translateY(-100%)"
              : "translateY(100%)",
          visibility: terminalStore.state.isOpen ? "visible" : "hidden",
          pointerEvents: terminalStore.state.isOpen ? "auto" : "none",
        }}
      >
        <TerminalPanel />
      </div>
    </div>
  );
}
