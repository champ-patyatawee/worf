import { Bot, MessageSquare } from 'lucide-react';
import { useUserStore } from '@/stores/userStore';
import { useAuthStore } from '@/stores/authStore';
import { Link, useLocation } from 'react-router-dom';
import { createDMSlug } from '@/utils/slug';
import { Avatar } from '@/components/common/Avatar';

export function AgentSidebar() {
  const { users } = useUserStore();
  const currentUser = useAuthStore((s) => s.user);
  const location = useLocation();

  const agents = users.filter(
    (u) => u.id !== currentUser?.id && (u.role === 'agent' || u.email?.startsWith('agent-'))
  );

  return (
    <aside
      className="w-[260px] h-full flex flex-col flex-shrink-0 border-r-2"
      style={{ backgroundColor: '#FFFBEB', borderColor: 'var(--color-border-primary)' }}
    >
      <div className="p-4 border-b-2" style={{ borderColor: 'var(--color-border-primary)' }}>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-[var(--radius-md)] border-2 flex items-center justify-center"
            style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-accent-primary)' }}
          >
            <Bot className="h-4 w-4 text-white" />
          </div>
          <span className="font-extrabold text-lg tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Agents</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {agents.length === 0 ? (
          <div className="text-sm px-2 py-2 text-center font-medium" style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }}>
            No agents available
          </div>
        ) : (
          agents.map((agent) => {
            const dmPath = `/agents/${createDMSlug(agent.name)}`;
            const isActive = location.pathname === dmPath;
            return (
              <Link
                key={agent.id}
                to={dmPath}
                className="flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 mb-1 transition-colors"
                style={{
                  backgroundColor: isActive ? 'var(--color-accent-subtle)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--color-accent-primary)' : '3px solid transparent',
                }}
              >
                <Avatar name={agent.name} src={agent.avatar} size="xs" status={agent.status} />
                <span
                  className="flex-1 text-sm truncate font-medium"
                  style={{
                    color: isActive ? 'var(--color-accent-primary)' : 'var(--color-text-primary)',
                    opacity: isActive ? 1 : 0.7,
                  }}
                >
                  {agent.name}
                </span>
                <MessageSquare
                  className="h-3.5 w-3.5 flex-shrink-0"
                  style={{ color: 'var(--color-text-tertiary)', opacity: 0.5 }}
                />
              </Link>
            );
          })
        )}
      </div>
    </aside>
  );
}
