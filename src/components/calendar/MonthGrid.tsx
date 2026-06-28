import type { Task } from '../../types';
import { CalendarTaskPill } from './CalendarTaskPill';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();

  const days: (number | null)[] = [];
  // Leading blanks
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }
  // Actual days
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }
  return days;
}

function isToday(year: number, month: number, day: number) {
  const today = new Date();
  return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
}

function isWeekend(dayIndex: number) {
  const dayOfWeek = dayIndex % 7;
  return dayOfWeek === 0 || dayOfWeek === 6;
}

export function MonthGrid({
  year,
  month,
  tasks,
}: {
  year: number;
  month: number;
  tasks: Task[];
  boards: { id: string; name: string }[];
}) {
  const days = getMonthDays(year, month);

  // Group tasks by day (using YYYY-MM-DD)
  const tasksByDay: Record<string, Task[]> = {};
  for (const task of tasks) {
    if (!task.due_date) continue;
    // due_date might be "2026-06-28" — group by that
    const dateStr = task.due_date;
    if (!tasksByDay[dateStr]) tasksByDay[dateStr] = [];
    tasksByDay[dateStr].push(task);
  }

  return (
    <div className="flex-1 p-4 overflow-auto" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="rounded-[var(--radius-lg)] border-2 overflow-hidden" style={{ borderColor: 'var(--color-border-primary)' }}>
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b-2" style={{ borderColor: 'var(--color-border-primary)' }}>
          {DAY_NAMES.map((name, i) => (
            <div
              key={name}
              className="px-3 py-2 text-xs font-extrabold uppercase tracking-wider"
              style={{
                color: isWeekend(i) ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
                backgroundColor: 'var(--color-bg-secondary)',
              }}
            >
              {name}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7" style={{ minHeight: '600px' }}>
          {days.map((day, idx) => {
            if (day === null) {
              return <div key={`blank-${idx}`} className="border-r border-b" style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-bg-secondary)' }} />;
            }

            const today = isToday(year, month, day);
            const weekend = isWeekend(idx);
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTasks = tasksByDay[dateStr] || [];

            return (
              <div
                key={dateStr}
                className="border-r border-b p-1.5 transition-colors min-h-[90px]"
                style={{
                  borderColor: 'var(--color-border-primary)',
                  backgroundColor: today ? 'var(--color-accent-primary)' : (weekend ? 'rgba(0,0,0,0.02)' : 'var(--color-bg-primary)'),
                  opacity: weekend && !today ? 0.6 : 1,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-xs font-bold leading-none"
                    style={{
                      color: today ? '#FFFFFF' : 'var(--color-text-primary)',
                      backgroundColor: today ? 'var(--color-accent-primary)' : 'transparent',
                      borderRadius: '50%',
                      width: today ? '22px' : 'auto',
                      height: today ? '22px' : 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {day}
                  </span>
                  {dayTasks.length > 2 && (
                    <span className="text-[10px] font-bold" style={{ color: 'var(--color-text-tertiary)' }}>
                      +{dayTasks.length - 2}
                    </span>
                  )}
                </div>
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 2).map((task) => (
                    <CalendarTaskPill key={task.id} task={task} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}