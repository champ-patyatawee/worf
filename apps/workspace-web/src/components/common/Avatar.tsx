import { forwardRef } from 'react';
import { cn } from '@/utils/cn';

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'busy' | 'away';
  className?: string;
  brutal?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, alt, name = '', size = 'md', status, className, brutal = true }, ref) => {
    const sizeClasses = {
      xs: 'h-[28px] w-[28px] text-[10px]',
      sm: 'h-9 w-9 text-[12px]',
      md: 'h-11 w-11 text-[14px]',
      lg: 'h-14 w-14 text-[18px]',
      xl: 'h-[72px] w-[72px] text-[22px]',
    };

    const statusSizes = {
      xs: 'h-2 w-2',
      sm: 'h-2.5 w-2.5',
      md: 'h-3 w-3',
      lg: 'h-3.5 w-3.5',
      xl: 'h-4 w-4',
    };

    const statusColors = {
      online: 'bg-status-success',
      offline: 'bg-text-tertiary',
      busy: 'bg-status-error',
      away: 'bg-status-warning',
    };

    return (
      <div ref={ref} className={cn('relative inline-flex flex-shrink-0', className)}>
        {src ? (
          <img
            src={src}
            alt={alt || name}
            className={cn(
              'rounded-full object-cover bg-bg-tertiary border-2 border-[var(--color-border-primary)]',
              brutal && 'shadow-[2px_2px_0px_#0D0D0D]',
              sizeClasses[size]
            )}
          />
        ) : (
          <div
            className={cn(
              'flex items-center justify-center rounded-full font-extrabold flex-shrink-0',
              'bg-bg-tertiary text-text-primary border-2 border-[var(--color-border-primary)]',
              brutal && 'shadow-[2px_2px_0px_#0D0D0D]',
              sizeClasses[size]
            )}
          >
            {getInitials(name)}
          </div>
        )}
        {status && (
          <span
            className={cn(
              'absolute bottom-0 right-0 block rounded-full ring-2 ring-[var(--color-bg-primary)]',
              statusSizes[size],
              statusColors[status]
            )}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';
