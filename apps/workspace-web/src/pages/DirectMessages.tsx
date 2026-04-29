import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/common';
import { useUserStore } from '@/stores/userStore';
import { useAuthStore } from '@/stores/authStore';
import { Search } from 'lucide-react';
import { createDMSlug } from '@/utils/slug';

export function DirectMessages() {
  const { users } = useUserStore();
  const currentUser = useAuthStore((state) => state.user);
  const [searchQuery, setSearchQuery] = useState('');

  const otherUsers = users.filter((u) => u.id !== currentUser?.id);
  const filteredUsers = otherUsers.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b-2 border-[var(--color-border-primary)] bg-bg-primary">
        <h1 className="text-lg font-semibold text-text-primary">Direct Messages</h1>
      </header>

      <div className="px-4 py-3 border-b-2 border-[var(--color-border-primary)] bg-bg-primary">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 border-2 border-[var(--color-border-primary)] rounded-[var(--radius-md)] text-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] focus:outline-none focus:shadow-[4px_4px_0px_#0D0D0D] focus:border-[var(--color-accent-primary)] transition-all"
          />
        </div>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto">
        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-text-tertiary">
            <p>No users found</p>
          </div>
        ) : (
          <div className="py-2">
            {filteredUsers.map((user) => (
              <Link
                key={user.id}
                to={`/messages/${createDMSlug(user.name)}`}
                className="flex items-center gap-3 px-4 py-2 hover:bg-bg-hover transition-colors"
              >
                <Avatar name={user.name} src={user.avatar} size="md" status={user.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{user.name}</p>
                  <p className="text-xs text-text-tertiary truncate">{user.email}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
