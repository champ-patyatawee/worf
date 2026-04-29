import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Settings } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import type { UserStatus } from '@/types';

const statusOptions: { value: UserStatus; label: string; color: string }[] = [
  { value: 'online', label: 'Online', color: '#4ADE80' },
  { value: 'busy', label: 'Do Not Disturb', color: '#FB7185' },
  { value: 'away', label: 'Away', color: '#FACC15' },
  { value: 'offline', label: 'Appear Offline', color: '#9CA3AF' },
];

interface UserDropdownProps {
  position?: 'bottom' | 'right';
  compact?: boolean;
}

export function UserDropdown({ position = 'bottom', compact = false }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { updateMyPresence } = usePresence();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleStatusSelect = (newStatus: UserStatus) => {
    updateMyPresence(newStatus);
    setIsOpen(false);
  };

  if (!user) return null;

  const currentStatus = statusOptions.find((s) => s.value === user.status) || statusOptions[0];

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-center rounded-[var(--radius-md)] border-2 transition-all duration-150',
          compact
            ? 'w-12 h-12 border-transparent hover:border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)]'
            : 'gap-2 p-1.5 border-transparent',
          isOpen && 'bg-[var(--color-bg-hover)] border-[var(--color-border-primary)]'
        )}
        onMouseEnter={(e) => { if (!isOpen) (e.currentTarget as HTMLElement).style.borderColor = compact ? 'var(--color-border-primary)' : 'transparent'; }}
        onMouseLeave={(e) => { if (!isOpen) (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}
        title={user.name}
      >
        <div className="relative">
          {compact ? (
            <User className="h-5 w-5" style={{ color: 'var(--color-text-secondary)' }} />
          ) : (
            <>
              <div
                className="rounded-full flex items-center justify-center w-7 h-7 border-2 border-[var(--color-border-primary)]"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-accent-primary)',
                }}
              >
                <span className="text-xs font-extrabold">{user.name.charAt(0).toUpperCase()}</span>
              </div>
              <div
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--color-bg-primary)]"
                style={{ backgroundColor: currentStatus.color }}
              />
            </>
          )}
        </div>
        {!compact && (
          <span className="hidden sm:block text-sm font-semibold text-[var(--color-text-primary)]">
            {user.name}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute w-64 rounded-[var(--radius-xl)] border-2 border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] py-1 z-50 animate-scaleIn overflow-hidden ${
            position === 'right' ? 'left-full ml-2 bottom-0' : 'right-0 mt-2'
          }`}
          style={{ boxShadow: '4px 4px 0px #0D0D0D' }}
        >
          <div className="px-3 py-2.5 border-b-2 border-[var(--color-border-primary)]">
            <p className="text-sm font-bold text-[var(--color-text-primary)]">{user.name}</p>
            <p className="text-xs text-[var(--color-text-tertiary)]">{user.email}</p>
          </div>

          <div className="px-3 py-2.5 border-b-2 border-[var(--color-border-primary)]">
            <p className="text-[10px] font-extrabold uppercase tracking-wider mb-2 text-[var(--color-text-tertiary)]">
              Set status
            </p>
            <div className="flex flex-wrap gap-1">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleStatusSelect(option.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-sm)] text-xs transition-all duration-150 border-2',
                    user.status === option.value
                      ? 'border-[var(--color-border-primary)] bg-[var(--color-bg-hover)]'
                      : 'border-transparent hover:border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)]'
                  )}
                >
                  <span className="w-2 h-2 rounded-full border border-[var(--color-border-primary)]" style={{ backgroundColor: option.color }} />
                  <span className="text-[var(--color-text-secondary)]">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => { setIsOpen(false); navigate('/profile-settings'); }}
            className="w-full flex items-center gap-3 px-3 py-2 text-left transition-all duration-150 border-2 border-transparent hover:border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)]"
          >
            <User className="h-4 w-4 text-[var(--color-text-tertiary)]" />
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">Profile Settings</span>
          </button>

          {user.role === 'admin' && (
            <button
              onClick={() => { setIsOpen(false); navigate('/settings'); }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left transition-all duration-150 border-2 border-transparent hover:border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)]"
            >
              <Settings className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              <span className="text-sm font-medium text-[var(--color-text-secondary)]">Settings</span>
            </button>
          )}

          <button
            onClick={() => { setIsOpen(false); logout(); }}
            className="w-full flex items-center gap-3 px-3 py-2 text-left transition-all duration-150 border-2 border-transparent hover:border-[var(--color-border-primary)] hover:bg-status-error/10"
          >
            <LogOut className="h-4 w-4 text-status-error" />
            <span className="text-sm font-medium text-status-error">Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}
