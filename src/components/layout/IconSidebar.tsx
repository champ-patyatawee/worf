import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Columns3, Bot, StickyNote, Target, Timer, Terminal, Settings, LayoutGrid } from "lucide-react";
import { terminalStore } from "../../stores/terminalStore";

const tabs = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { id: "notes", icon: StickyNote, label: "Notes", path: "/notes" },
  { id: "projects", icon: LayoutGrid, label: "Projects", path: "/projects" },
  { id: "okr", icon: Target, label: "OKRs", path: "/okr" },
  { id: "ai-chat", icon: Bot, label: "AI Chat", path: "/ai-chat" },
];

export function IconSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [, forceUpdate] = useState(0);

  // Reactivity for terminal store state
  useEffect(() => {
    const unsub = terminalStore.subscribe(() => forceUpdate((n) => n + 1));
    return () => unsub();
  }, []);

  const activeTab = () => {
    const path = location.pathname;
    if (path === "/") return "dashboard";
    if (path.startsWith("/notes")) return "notes";
    if (path.startsWith("/project") || path.startsWith("/projects")) return "projects";
    if (path.startsWith("/okr")) return "okr";
    if (path.startsWith("/ai-chat")) return "ai-chat";
    if (path.startsWith("/settings")) return "settings";
    return "dashboard";
  };

  const isActive = activeTab();

  return (
    <aside
      className="flex flex-col items-center py-4 h-full border-r-2 z-50 flex-shrink-0"
      style={{
        width: "64px",
        backgroundColor: "#FFFBEB",
        borderColor: "var(--color-border-primary)",
        boxShadow: "2px 0 12px rgba(0,0,0,0.06)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center justify-center w-10 h-10 rounded-[var(--radius-md)] font-extrabold text-[18px] border-2 border-[var(--color-border-primary)] mb-6"
        style={{
          backgroundColor: "var(--color-accent-primary)",
          color: "#FFFFFF",
          boxShadow: "2px 2px 0px #0D0D0D",
        }}
      >
        W
      </div>

      {/* Navigation */}
      <nav className="flex flex-col items-center gap-2 flex-1">
        {tabs.map((tab) => {
          const active = isActive === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (terminalStore.state.terminalMode === 'fullscreen' && terminalStore.state.isOpen) {
                  terminalStore.toggle();
                }
                navigate(tab.path);
              }}
              className="flex items-center justify-center w-12 h-12 rounded-[var(--radius-md)] transition-all duration-150 border-2"
              style={{
                backgroundColor: active
                  ? "var(--color-accent-primary)"
                  : "transparent",
                color: active ? "#FFFFFF" : "var(--color-text-secondary)",
                borderColor: active
                  ? "var(--color-border-primary)"
                  : "transparent",
                boxShadow: active ? "3px 3px 0px rgba(0,0,0,0.2)" : undefined,
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = "var(--color-bg-hover)";
                  e.currentTarget.style.borderColor = "var(--color-border-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.borderColor = "transparent";
                }
              }}
              aria-label={tab.label}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </nav>

      {/* Terminal toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          terminalStore.toggle();
        }}
        className="flex items-center justify-center w-12 h-12 rounded-[var(--radius-md)] transition-all duration-150 border-2 mb-2"
        style={{
          backgroundColor: terminalStore.state.isOpen
            ? "var(--color-accent-primary)"
            : "transparent",
          color: terminalStore.state.isOpen
            ? "#FFFFFF"
            : "var(--color-text-secondary)",
          borderColor: terminalStore.state.isOpen
            ? "var(--color-border-primary)"
            : "transparent",
          boxShadow: terminalStore.state.isOpen
            ? "3px 3px 0px rgba(0,0,0,0.2)"
            : undefined,
        }}
        onMouseEnter={(e) => {
          if (!terminalStore.state.isOpen) {
            e.currentTarget.style.backgroundColor = "var(--color-bg-hover)";
            e.currentTarget.style.borderColor = "var(--color-border-primary)";
          }
        }}
        onMouseLeave={(e) => {
          if (!terminalStore.state.isOpen) {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.borderColor = "transparent";
          }
        }}
        aria-label="Toggle terminal"
      >
        <Terminal className="h-5 w-5" />
      </button>

      {/* Settings at bottom */}
      <button
        onClick={() => navigate("/settings/ai")}
        className="flex items-center justify-center w-12 h-12 rounded-[var(--radius-md)] transition-all duration-150 border-2"
        style={{
          backgroundColor:
            isActive === "settings" ? "var(--color-accent-primary)" : "transparent",
          color:
            isActive === "settings" ? "#FFFFFF" : "var(--color-text-secondary)",
          borderColor:
            isActive === "settings" ? "var(--color-border-primary)" : "transparent",
          boxShadow: isActive === "settings" ? "3px 3px 0px rgba(0,0,0,0.2)" : undefined,
        }}
        onMouseEnter={(e) => {
          if (isActive !== "settings") {
            e.currentTarget.style.backgroundColor = "var(--color-bg-hover)";
            e.currentTarget.style.borderColor = "var(--color-border-primary)";
          }
        }}
        onMouseLeave={(e) => {
          if (isActive !== "settings") {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.borderColor = "transparent";
          }
        }}
        aria-label="Settings"
      >
        <Settings className="h-5 w-5" />
      </button>
    </aside>
  );
}
