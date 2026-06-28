import { ChevronLeft, ChevronRight } from 'lucide-react';

export function CalendarHeader({
  currentDate,
  onPrevMonth,
  onNextMonth,
  onToday,
}: {
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}) {
  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b-2 flex-shrink-0"
      style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="flex items-center gap-3">
        <button
          onClick={onPrevMonth}
          className="p-2 rounded-[var(--radius-md)] border-2 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none"
          style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-primary)', color: 'var(--color-text-primary)' }}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h1 className="text-xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
          {monthYear}
        </h1>
        <button
          onClick={onNextMonth}
          className="p-2 rounded-[var(--radius-md)] border-2 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none"
          style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-primary)', color: 'var(--color-text-primary)' }}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <button
        onClick={onToday}
        className="px-4 py-2 text-sm font-bold rounded-[var(--radius-md)] border-2 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none"
        style={{ backgroundColor: 'var(--color-accent-primary)', borderColor: 'var(--color-border-primary)', color: 'white' }}
      >
        Today
      </button>
    </div>
  );
}