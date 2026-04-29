import { cn } from '@/utils/cn';

interface DateDividerProps {
  date: string;
  className?: string;
}

export function DateDivider({ date, className }: DateDividerProps) {
  return (
    <div className={cn('flex items-center gap-3 px-4 py-2.5', className)}>
      <div className="flex-1 h-px bg-[var(--color-border-primary)]" />
      <span
        className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-text-tertiary)] px-3 py-1 rounded-[var(--radius-full)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]"
      >
        {date}
      </span>
      <div className="flex-1 h-px bg-[var(--color-border-primary)]" />
    </div>
  );
}
