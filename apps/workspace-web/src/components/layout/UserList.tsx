import { useState, useMemo } from 'react';
import { MessageCircle, Search, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUserStore } from '@/stores/userStore';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { Avatar } from '@/components/common/Avatar';
import { Link, useNavigate } from 'react-router-dom';
import { createDMSlug } from '@/utils/slug';
import type { User, UserStatus } from '@/types';

const statusOrder: Record<UserStatus, number> = {
  online: 0,
  busy: 1,
  away: 2,
  offline: 3,
};

export function UserList() {
  const { users, isLoading } = useUserStore();
  const { sidebarCollapsed } = useUIStore();
  const currentUser = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [searchQuery] = useState('');
  const [isStartDModalOpen, setIsStartDModalOpen] = useState(false);
  const [dmSearchQuery, setDmSearchQuery] = useState('');

  const nonAgentUsers = useMemo(
    () => users.filter((u) => u.role !== 'agent' && !u.email?.startsWith('agent-')),
    [users]
  );

  const sortedUsers = useMemo(() => {
    const filtered = nonAgentUsers.filter((user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return [...filtered].sort((a, b) => {
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return a.name.localeCompare(b.name);
    });
  }, [nonAgentUsers, searchQuery]);

  const onlineUsers = useMemo(
    () => sortedUsers.filter((user) => user.status === 'online'),
    [sortedUsers]
  );

  const offlineUsers = useMemo(
    () => sortedUsers.filter((user) => user.status !== 'online'),
    [sortedUsers]
  );

  const dmSearchUsers = useMemo(() => {
    if (!dmSearchQuery.trim()) return nonAgentUsers.filter((u) => u.id !== currentUser?.id);
    return nonAgentUsers
      .filter((u) => u.id !== currentUser?.id)
      .filter((u) => u.name.toLowerCase().includes(dmSearchQuery.toLowerCase()));
  }, [nonAgentUsers, currentUser, dmSearchQuery]);

  const handleStartDM = (userName: string) => {
    setIsStartDModalOpen(false);
    setDmSearchQuery('');
    navigate(`/messages/${createDMSlug(userName)}`);
  };

  const renderUser = (user: User) => {
    const dmPath = `/messages/${createDMSlug(user.name)}`;

    return (
      <li key={user.id}>
        <Link
          to={dmPath}
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-md)] transition-all duration-150 border-2 border-transparent hover:border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)]',
            sidebarCollapsed && 'justify-center'
          )}
        >
          <Avatar
            name={user.name}
            src={user.avatar}
            size="xs"
            status={user.status}
          />
          {!sidebarCollapsed && (
            <span className="flex-1 text-[14px] truncate font-medium text-[var(--color-text-secondary)]">
              {user.name}
            </span>
          )}
        </Link>
      </li>
    );
  };

  const StartDMModal = () => (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${isStartDModalOpen ? '' : 'hidden'}`}
    >
      <div className="absolute inset-0 bg-black/50" onClick={() => setIsStartDModalOpen(false)} />
      <div
        className="relative z-10 w-full max-w-[420px] rounded-[var(--radius-xl)] border-2 border-[var(--color-border-primary)] animate-scaleIn overflow-hidden bg-[var(--color-bg-secondary)]"
        style={{ boxShadow: '8px 8px 0px #0D0D0D' }}
      >
        <div className="flex items-center justify-between p-5 border-b-2 border-[var(--color-border-primary)] bg-[var(--color-bg-tertiary)]">
          <h3 className="text-[18px] font-extrabold text-[var(--color-text-primary)]">New message</h3>
          <button
            onClick={() => setIsStartDModalOpen(false)}
            className="p-1.5 rounded-[var(--radius-sm)] transition-colors border-2 border-transparent hover:border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)]"
          >
            <X className="h-5 w-5 text-[var(--color-text-secondary)]" />
          </button>
        </div>
        <div className="p-5">
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-accent-primary)]" />
            <input
              type="text"
              placeholder="Search people to message..."
              value={dmSearchQuery}
              onChange={(e) => setDmSearchQuery(e.target.value)}
              autoFocus
              className="w-full h-12 pl-11 pr-4 rounded-[var(--radius-md)] text-[15px] font-medium border-2 border-[var(--color-border-primary)] bg-[var(--color-bg-tertiary)] focus:border-[var(--color-accent-primary)] focus:outline-none focus:shadow-[4px_4px_0px_#0D0D0D]"
              style={{ color: 'var(--color-text-primary)' }}
            />
          </div>
          <div className="max-h-64 overflow-y-auto scrollbar-thin">
            {dmSearchUsers.length === 0 ? (
              <p className="text-center py-6 text-[15px] text-[var(--color-text-secondary)]">
                {dmSearchQuery ? 'No users found' : 'No users available'}
              </p>
            ) : (
              <div className="space-y-1">
                {dmSearchUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleStartDM(user.name)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-[var(--radius-md)] transition-all duration-150 text-left border-2 border-transparent hover:border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)]"
                  >
                    <Avatar name={user.name} src={user.avatar} size="md" status={user.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-bold truncate text-[var(--color-text-primary)]">
                        {user.name}
                      </p>
                      <p className="text-[13px] truncate text-[var(--color-text-secondary)]">
                        {user.email}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (sidebarCollapsed) {
    return (
      <>
        <div className="py-4 border-t-2 border-[var(--color-border-primary)]">
          <div className="flex flex-col items-center gap-2.5" title="Direct Messages">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="h-9 w-9 rounded-full animate-pulse bg-[var(--color-bg-hover)] border-2 border-[var(--color-border-primary)]" />
              ))
            ) : sortedUsers.length === 0 ? (
              <div className="text-[12px] py-2 text-[var(--color-text-tertiary)]">No users</div>
            ) : (
              sortedUsers.slice(0, 8).map((user) => (
                <Link key={user.id} to={`/messages/${user.id}`} className="relative" title={user.name}>
                  <Avatar name={user.name} src={user.avatar} size="sm" status={user.status} />
                </Link>
              ))
            )}
          </div>
        </div>
        <StartDMModal />
      </>
    );
  }

  return (
    <>
      <div className="py-3 flex flex-col h-full">
        <div className="px-4 mb-2 flex items-center justify-between flex-shrink-0">
          <span className="text-[13px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--color-text-secondary)' }}>
            Direct Messages
          </span>
          <button
            onClick={() => setIsStartDModalOpen(true)}
            className="p-1.5 rounded-[var(--radius-sm)] transition-all duration-150 border-2 border-transparent hover:border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)]"
            title="New direct message"
          >
            <MessageCircle className="h-4 w-4 text-[var(--color-text-secondary)]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
          {isLoading ? (
            <div className="space-y-1 px-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-2">
                  <div className="h-9 w-9 rounded-full animate-pulse bg-[var(--color-bg-hover)] border-2 border-[var(--color-border-primary)]" />
                  <div className="h-4 flex-1 animate-pulse rounded bg-[var(--color-bg-hover)]" />
                </div>
              ))}
            </div>
          ) : sortedUsers.length === 0 ? (
            <div className="px-4 py-6 text-center text-[15px] text-[var(--color-text-secondary)]">
              No users available
            </div>
          ) : (
            <>
              {searchQuery === '' && onlineUsers.length > 0 && (
                <>
                  <div className="px-4 mb-1">
                    <span className="text-[12px] font-bold text-[var(--color-text-secondary)]">Online</span>
                  </div>
                  <ul className="space-y-0.5 px-2 mb-3">{onlineUsers.map(renderUser)}</ul>
                </>
              )}

              {searchQuery && (
                <div className="px-4 mb-1">
                  <span className="text-[12px] font-bold text-[var(--color-text-secondary)]">Results</span>
                </div>
              )}
              <ul className="space-y-0.5 px-2">{(searchQuery ? sortedUsers : offlineUsers).map(renderUser)}</ul>
            </>
          )}
        </div>
      </div>
      <StartDMModal />
    </>
  );
}
