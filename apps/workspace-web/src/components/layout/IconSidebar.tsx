import { LayoutDashboard, MessageSquare, StickyNote, FolderKanban, Bot } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/stores/uiStore';
import { UserDropdown } from './UserDropdown';

const tabs = [
  { id: 'dashboard' as const, icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { id: 'chat' as const, icon: MessageSquare, label: 'Chat', path: '/channels' },
  { id: 'agent' as const, icon: Bot, label: 'Agents', path: '/agents' },
  { id: 'note' as const, icon: StickyNote, label: 'Note', path: '/notes' },
  { id: 'kanban' as const, icon: FolderKanban, label: 'Kanban', path: '/kanban' },
];

export function IconSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeNavTab, setActiveNavTab, toggleSidebar, setSidebarCollapsed } = useUIStore();

  const handleTabClick = (tabId: typeof tabs[number]['id']) => {
    const tab = tabs.find((t) => t.id === tabId)!;

    if (tabId === 'chat' || tabId === 'kanban') {
      if (activeNavTab === tabId) {
        // Already on this tab: toggle sidebar
        toggleSidebar();
      } else {
        // Switching to this tab: navigate and expand sidebar
        setActiveNavTab(tabId);
        setSidebarCollapsed(false);
        if (!location.pathname.startsWith(tab.path)) {
          navigate(tab.path);
        }
      }
    } else if (tabId === 'dashboard') {
      setActiveNavTab(tabId);
      setSidebarCollapsed(true);
      if (!location.pathname.startsWith(tab.path)) {
        navigate(tab.path);
      }
    } else {
      // agent, note: expand sidebar
      setActiveNavTab(tabId);
      setSidebarCollapsed(false);
      if (!location.pathname.startsWith(tab.path)) {
        navigate(tab.path);
      }
    }
  };

  return (
    <aside
      className="flex flex-col items-center py-4 h-full border-r-2 border-[var(--color-border-primary)] z-50"
      style={{
        width: '64px',
        backgroundColor: '#FFFBEB',
        boxShadow: '2px 0 12px rgba(0,0,0,0.06)',
      }}
    >
      {/* Logo / App Icon */}
      <div
        className="flex items-center justify-center w-10 h-10 rounded-[var(--radius-md)] font-extrabold text-[18px] border-2 border-[var(--color-border-primary)] shadow-[2px_2px_0px_#0D0D0D] mb-6"
        style={{
          backgroundColor: 'var(--color-accent-primary)',
          color: '#FFFFFF',
        }}
      >
        W
      </div>

      {/* Navigation Icons */}
      <nav className="flex flex-col items-center gap-2 flex-1">
        {tabs.map((tab) => {
          const isActive = activeNavTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                'flex items-center justify-center w-12 h-12 rounded-[var(--radius-md)] transition-all duration-150 border-2',
                isActive
                  ? 'bg-[var(--color-accent-primary)] text-white border-[var(--color-border-primary)] shadow-[3px_3px_0px_rgba(0,0,0,0.2)]'
                  : 'bg-transparent text-[var(--color-text-secondary)] border-transparent hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-border-primary)]'
              )}
              aria-label={tab.label}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </nav>

      <div className="mt-auto mb-2">
        <UserDropdown position="right" compact />
      </div>
    </aside>
  );
}
