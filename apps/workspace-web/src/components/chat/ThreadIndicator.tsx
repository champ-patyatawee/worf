import { MessageSquare } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ThreadIndicatorProps {
  count: number;
  onClick: () => void;
  className?: string;
}

export function ThreadIndicator({ count, onClick, className }: ThreadIndicatorProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'mt-2 py-1.5 px-2 text-xs rounded-[var(--radius-md)] transition-all duration-150 flex items-center gap-1.5 border-2 border-transparent hover:border-[var(--color-border-primary)]',
        className
      )}
      style={{ color: 'var(--color-accent-primary)', backgroundColor: 'var(--color-accent-subtle)' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-hover)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-accent-subtle)'; }}
    >
      <MessageSquare className="h-3 w-3" />
      <span className="font-bold">
        {count} {count === 1 ? 'reply' : 'replies'}
      </span>
    </button>
  );
}
