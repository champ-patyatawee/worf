import { Hash, ChevronDown, Plus, Lock } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useChannelStore } from '@/stores/channelStore';
import { useUIStore } from '@/stores/uiStore';
import { Link, useLocation } from 'react-router-dom';
import { UserList } from '@/components/layout/UserList';
import { createChannelSlug } from '@/utils/slug';

export function Sidebar() {
  const { channels, unreadCounts } = useChannelStore();
  const { sidebarCollapsed, openModal } = useUIStore();
  const location = useLocation();

  return (
    <aside
      className={cn(
        'flex flex-col h-full border-r-2 border-[var(--color-border-primary)]',
        sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'
      )}
      style={{
        backgroundColor: '#FFFBEB',
        boxShadow: '4px 0 24px rgba(0,0,0,0.08)',
      }}
    >
      {/* Channels Navigation */}
      {!sidebarCollapsed && (
        <div className="flex items-center justify-between px-4 pt-4 pb-1">
          <span className="text-[13px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--color-text-secondary)' }}>Channels</span>
        </div>
      )}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        <ul className="space-y-1 px-2">
          {channels.map((channel) => {
            const channelSlug = createChannelSlug(channel.name);
            const isActive = location.pathname === `/channels/${channelSlug}`;
            const unread = unreadCounts[channel.id] || 0;

            return (
              <li key={channel.id}>
                <Link
                  to={`/channels/${channelSlug}`}
                  className={cn(
                    'group flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-md)] transition-all duration-150',
                    isActive
                      ? 'bg-[var(--color-text-primary)] text-white border-2 border-[var(--color-border-primary)] shadow-[3px_3px_0px_rgba(0,0,0,0.2)]'
                      : 'border-2 border-transparent hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-border-primary)]',
                    sidebarCollapsed && 'justify-center px-0 py-3'
                  )}
                >
                  {channel.type === 'private' ? (
                    <Lock className={cn(
                      'h-4 w-4 flex-shrink-0',
                      isActive ? 'text-[var(--color-accent-primary)]' : 'text-[var(--color-text-secondary)]'
                    )} />
                  ) : (
                    <Hash className={cn(
                      'h-4 w-4 flex-shrink-0',
                      isActive ? 'text-[var(--color-accent-primary)]' : 'text-[var(--color-text-secondary)]'
                    )} />
                  )}
                  {!sidebarCollapsed && (
                    <>
                      <span
                        className={cn(
                          'flex-1 text-[14px] truncate',
                          isActive ? 'text-white font-bold' : 'text-[var(--color-text-secondary)] font-medium'
                        )}
                      >
                        {channel.name}
                      </span>
                      {unread > 0 && (
                        <span
                          className="text-[12px] font-extrabold px-2 py-0.5 rounded-[var(--radius-full)] bg-[var(--color-accent-primary)] text-white"
                        >
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              </li>
            );
          })}
          {!sidebarCollapsed && (
            <li>
              <button
                onClick={() => openModal('createChannel')}
                className="group flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-md)] transition-all duration-150 w-full border-2 border-transparent hover:border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)]"
              >
                <Plus className="h-4 w-4 transition-transform group-hover:scale-110 text-[var(--color-text-secondary)]" />
                <span className="text-[14px] font-semibold text-[var(--color-text-secondary)]">Add channels</span>
              </button>
            </li>
          )}
        </ul>
      </nav>

      {/* Direct Messages */}
      <div className="h-[45%] border-t-2 border-[var(--color-border-primary)] overflow-hidden">
        <UserList />
      </div>
    </aside>
  );
}
