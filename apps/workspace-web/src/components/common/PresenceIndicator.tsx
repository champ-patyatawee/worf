import { cn } from '@/utils/cn';
import type { UserStatus } from '@/types';

interface PresenceIndicatorProps {
  status: UserStatus;
  size?: 'sm' | 'md';
  className?: string;
}

const statusColors: Record<UserStatus, string> = {
  online: 'bg-status-success',
  offline: 'bg-text-tertiary',
  busy: 'bg-status-error',
  away: 'bg-status-warning',
};

export function PresenceIndicator({
  status,
  size = 'md',
  className,
}: PresenceIndicatorProps) {
  const sizeClasses = size === 'sm' ? 'h-2 w-2' : 'h-3 w-3';

  return (
    <span
      className={cn(
        'block rounded-full ring-2 ring-[var(--color-bg-primary)] border border-[var(--color-border-primary)]',
        sizeClasses,
        statusColors[status],
        className
      )}
    />
  );
}
