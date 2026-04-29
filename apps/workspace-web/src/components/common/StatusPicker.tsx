import { useState, useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { usePresence } from '@/hooks/usePresence';
import type { UserStatus } from '@/types';

interface StatusPickerProps {
  className?: string;
}

const statusOptions: { value: UserStatus; label: string; color: string; ring: string }[] = [
  { value: 'online', label: 'Online', color: 'bg-status-success', ring: 'ring-status-success' },
  { value: 'busy', label: 'Do Not Disturb', color: 'bg-status-error', ring: 'ring-status-error' },
  { value: 'away', label: 'Away', color: 'bg-status-warning', ring: 'ring-status-warning' },
  { value: 'offline', label: 'Appear Offline', color: 'bg-text-tertiary', ring: 'ring-text-tertiary' },
];

export function StatusPicker({ className }: StatusPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
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

  const handleStatusSelect = (status: UserStatus) => {
    updateMyPresence(status);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 p-1.5 rounded-[var(--radius-md)] border-2 border-transparent',
          'hover:bg-bg-hover hover:border-[var(--color-border-primary)] transition-colors-fast',
          isOpen && 'bg-bg-hover border-[var(--color-border-primary)]'
        )}
        title="Change status"
      >
        <span className="sr-only">Change status</span>
        <div className="w-6 h-6 rounded-full flex items-center justify-center">
          <span
            className={cn(
              'w-3 h-3 rounded-full border border-[var(--color-border-primary)]',
              statusOptions.find((s) => s.value === 'online')?.color || 'bg-status-success'
            )}
          />
        </div>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-[var(--radius-lg)] border-2 border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] py-1 z-50 animate-scaleIn"
          style={{ boxShadow: '4px 4px 0px #0D0D0D' }}
        >
          <div className="px-3 py-2 text-xs font-extrabold text-[var(--color-text-tertiary)] uppercase tracking-wider">
            Set your status
          </div>
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleStatusSelect(option.value)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-left',
                'hover:bg-bg-hover transition-colors-fast'
              )}
            >
              <span className={cn('w-3 h-3 rounded-full border border-[var(--color-border-primary)]', option.color)} />
              <span className="text-sm font-medium text-[var(--color-text-primary)]">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
