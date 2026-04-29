import { forwardRef } from 'react';
import { Avatar } from '@/components/common';
import { formatDate } from '@/utils/formatDate';
import { cn } from '@/utils/cn';
import type { Message as MessageType } from '@/types';

interface MessageProps {
  message: MessageType;
  isOwn?: boolean;
  showAvatar?: boolean;
  className?: string;
}

export const Message = forwardRef<HTMLDivElement, MessageProps>(
  ({ message, isOwn = false, showAvatar = true, className }, ref) => {
    const user = message.user;

    return (
      <div
        ref={ref}
        className={cn(
          'flex gap-2.5 px-4 py-0.5 hover:bg-[var(--color-bg-hover)] transition-colors-fast',
          className
        )}
      >
        {showAvatar ? (
          <Avatar
            name={user?.name || 'Unknown'}
            src={user?.avatar}
            size="xs"
            status={user?.status}
            className="flex-shrink-0 mt-0.5"
          />
        ) : (
          <div className="w-7 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-sm font-bold text-[var(--color-text-primary)]">
              {user?.name || 'Unknown User'}
            </span>
            <span className="text-[10px] font-medium text-[var(--color-text-tertiary)]">
              {formatDate(message.createdAt)}
            </span>
          </div>
          <p className={cn(
            'text-[15px] break-words whitespace-pre-wrap',
            message.isError ? 'text-status-error' : isOwn ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'
          )}>
            {message.content}
          </p>
        </div>
      </div>
    );
  }
);

Message.displayName = 'Message';
