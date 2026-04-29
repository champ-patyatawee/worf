import { Link, useNavigate } from 'react-router-dom';
import { Hash, Search, Users, Lock, Settings2 } from 'lucide-react';
import { useChannelStore } from '@/stores/channelStore';

interface HeaderProps {
  onInviteClick?: () => void;
  onSettingsClick?: () => void;
}

export function Header({ onInviteClick, onSettingsClick }: HeaderProps) {
  const navigate = useNavigate();
  const { activeChannelId, channels } = useChannelStore();
  const activeChannel = channels.find((c) => c.id === activeChannelId);

  return (
    <header
      className="flex items-center justify-between px-4 py-2.5 border-b-2 transition-colors duration-100"
      style={{
        backgroundColor: 'var(--color-bg-primary)',
        borderColor: 'var(--color-border-primary)',
      }}
    >
      <div className="flex items-center gap-3">
        <Link to="/channels" className="flex items-center gap-2 group">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] transition-all duration-100 border-2"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border-primary)',
              boxShadow: '2px 2px 0px #0D0D0D',
            }}
          >
            {activeChannel?.type === 'private' ? (
              <Lock className="h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
            ) : (
              <Hash className="h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
            )}
          </div>
          <span className="font-bold hidden sm:inline text-[15px]" style={{ color: 'var(--color-text-primary)' }}>
            {activeChannel?.name || 'Select a channel'}
          </span>
        </Link>
        {activeChannel?.description && (
          <>
            <div className="hidden sm:block w-px h-5" style={{ backgroundColor: 'var(--color-border-secondary)' }} />
            <span className="hidden sm:block text-sm max-w-[200px] truncate" style={{ color: 'var(--color-text-tertiary)' }}>
              {activeChannel.description}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-0.5">
        <button
          onClick={() => navigate('/search')}
          className="p-2 rounded-[var(--radius-md)] transition-colors duration-100 border-2 border-transparent hover:border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)]"
          title="Search messages"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          <Search className="h-4 w-4" />
        </button>

        {activeChannel && onInviteClick && (
          <button
            onClick={onInviteClick}
            className="p-2 rounded-[var(--radius-md)] transition-colors duration-100 border-2 border-transparent hover:border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)]"
            title="Members"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <Users className="h-4 w-4" />
          </button>
        )}

        {activeChannel && onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className="p-2 rounded-[var(--radius-md)] transition-colors duration-100 border-2 border-transparent hover:border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)]"
            title="Channel settings"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <Settings2 className="h-4 w-4" />
          </button>
        )}

      </div>
    </header>
  );
}
