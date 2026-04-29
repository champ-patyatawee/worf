import { Outlet, Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';
import { Settings, Bot, FileText, ChevronRight } from 'lucide-react';

const settingsTabs = [
  { id: 'ai', label: 'AI Provider', icon: Bot, path: '/settings/ai' },
  { id: 'agents', label: 'Agents', icon: Bot, path: '/settings/agents' },
  { id: 'note', label: 'Note LLM', icon: FileText, path: '/settings/note' },
];

export function SettingsLayout() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="animate-spin rounded-full h-7 w-7 border-2" style={{ borderColor: 'var(--color-text-tertiary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/channels" replace />;
  }

  const currentTab = settingsTabs.find(tab => location.pathname.startsWith(tab.path))?.id || 'ai';

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <aside
        className="w-56 flex flex-col border-r-2 border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]"
      >
        <div className="p-4 border-b-2 border-[var(--color-border-primary)]">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-[var(--color-accent-primary)]" />
            <span className="text-sm font-bold text-[var(--color-text-primary)]">Settings</span>
          </div>
        </div>

        <nav className="flex-1 p-2">
          {settingsTabs.map((tab) => {
            const isActive = currentTab === tab.id;
            const Icon = tab.icon;

            return (
              <Link
                key={tab.id}
                to={tab.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] mb-0.5 transition-all duration-150 border-2',
                  isActive
                    ? 'border-[var(--color-border-primary)] bg-[var(--color-accent-subtle)] shadow-[2px_2px_0px_#0D0D0D]'
                    : 'border-transparent hover:border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)]'
                )}
              >
                <Icon className="h-4 w-4" style={isActive ? { color: 'var(--color-accent-primary)' } : { color: 'var(--color-text-tertiary)' }} />
                <span className="text-sm font-medium" style={isActive ? { color: 'var(--color-text-primary)' } : { color: 'var(--color-text-secondary)' }}>
                  {tab.label}
                </span>
                {isActive && <ChevronRight className="h-3 w-3 ml-auto text-[var(--color-accent-primary)]" />}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 overflow-auto" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <Outlet />
      </main>
    </div>
  );
}
