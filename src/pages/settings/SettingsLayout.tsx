import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { Settings2, Brain, FileText, Terminal, Keyboard, Database } from "lucide-react";

const tabs = [
  { id: "ai", icon: Brain, label: "AI Providers", path: "/settings/ai" },
  { id: "note", icon: Settings2, label: "Note Settings", path: "/settings/note" },
  { id: "prompts", icon: FileText, label: "Prompt Templates", path: "/settings/prompts" },
  { id: "terminal", icon: Terminal, label: "Terminal", path: "/settings/terminal" },
  { id: "navigation", icon: Keyboard, label: "Navigation", path: "/settings/navigation" },
  { id: "backup", icon: Database, label: "Backup", path: "/settings/backup" },
];

export function SettingsLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname.split("/").pop() || "ai";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b-2 flex-shrink-0"
        style={{ backgroundColor: "var(--color-bg-primary)", borderColor: "var(--color-border-primary)" }}>
        <Settings2 className="w-5 h-5" style={{ color: "var(--color-text-secondary)" }} />
        <h2 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>Settings</h2>
      </div>

      <div className="flex gap-1 px-4 pt-3 border-b-2 flex-shrink-0"
        style={{ backgroundColor: "var(--color-bg-primary)", borderColor: "var(--color-border-primary)" }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => navigate(tab.path)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-t-[var(--radius-md)] border-2 border-b-0 transition-colors-fast"
              style={{
                backgroundColor: isActive ? "var(--color-bg-secondary)" : "transparent",
                borderColor: isActive ? "var(--color-border-primary)" : "transparent",
                color: isActive ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                marginBottom: "-2px",
              }}>
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin" style={{ backgroundColor: "var(--color-bg-secondary)" }}>
        <Outlet />
      </div>
    </div>
  );
}
