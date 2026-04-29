import { useEffect } from 'react';
import { useUserStore } from '@/stores/userStore';

export function TeamMembersWidget() {
  const { users, isLoading, fetchUsers } = useUserStore();
  useEffect(() => { if (users.length === 0) fetchUsers(); }, [users.length, fetchUsers]);

  const people = users.filter(u => u.role !== 'agent' && !u.email?.startsWith('agent-'));
  const online = people.filter(u => u.status === 'online');

  return (
    <div className="min-h-full p-4 flex flex-col" style={{ backgroundColor: '#BFDBFE' }}>
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Team</span>

      {isLoading ? (
        <div className="flex items-center justify-center flex-1"><div className="animate-spin rounded-full h-5 w-5 border-2" style={{ borderColor: 'var(--color-text-tertiary)', borderTopColor: 'transparent' }} /></div>
      ) : (
        <>
          <div className="flex items-baseline gap-1 mt-1 mb-3">
            <span className="font-mono text-2xl font-bold text-[var(--color-text-primary)]">{online.length}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">online</span>
            <span className="text-[10px] text-[var(--color-text-tertiary)]">·</span>
            <span className="text-[10px] font-semibold text-[var(--color-text-tertiary)]">{people.length} total</span>
          </div>
          <div className="space-y-1.5 flex-1 overflow-y-auto">
            {people.slice(0, 6).map(user => (
              <div key={user.id} className="flex items-center gap-3 px-3 py-2 rounded-[8px] border-2 border-[#0D0D0D] bg-white/70 shadow-[2px_2px_0px_#0D0D0D]">
                <div className="relative flex-shrink-0">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full border-2 border-[#0D0D0D] object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-[#0D0D0D] bg-[var(--color-accent-subtle)] flex items-center justify-center text-[11px] font-bold text-[var(--color-accent-primary)]">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white rounded-full ${
                    user.status === 'online' ? 'bg-[var(--color-success)]' :
                    user.status === 'busy' ? 'bg-[var(--color-error)]' :
                    user.status === 'away' ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-text-tertiary)]'
                  }`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold text-[var(--color-text-primary)] truncate">{user.name}</div>
                  <div className="text-[11px] font-semibold text-[var(--color-text-secondary)] capitalize">{user.status}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
