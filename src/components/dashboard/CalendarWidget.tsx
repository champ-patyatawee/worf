import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid: (number | null)[] = [];
  for (let i = 0; i < first; i++) grid.push(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}

export function CalendarWidget() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const grid = getMonthGrid(year, month);
  const prev = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  return (
    <div className="min-h-full p-4 flex flex-col" style={{ backgroundColor: '#FFFBEB' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Calendar</span>
        <span className="text-[13px] font-bold text-[var(--color-text-primary)]">{MONTHS[month]} {year}</span>
      </div>
      <div className="flex items-center justify-between mb-2.5">
        <button onClick={prev} className="w-7 h-7 flex items-center justify-center rounded-[8px] border-2 border-[#0D0D0D] bg-white shadow-[2px_2px_0px_#0D0D0D] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#0D0D0D] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#0D0D0D] transition-all" aria-label="Previous month">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button onClick={next} className="w-7 h-7 flex items-center justify-center rounded-[8px] border-2 border-[#0D0D0D] bg-white shadow-[2px_2px_0px_#0D0D0D] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#0D0D0D] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#0D0D0D] transition-all" aria-label="Next month">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAYS.map(d => <div key={d} className="text-center text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase py-0.5">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5 flex-1 content-start">
        {grid.map((day, i) => {
          const isToday = day !== null && day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          return (
            <div key={i} className="flex items-center justify-center">
              {day !== null && (
                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-bold ${isToday ? 'bg-[var(--color-accent-primary)] text-white border-2 border-[#0D0D0D] shadow-[2px_2px_0px_#0D0D0D]' : 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'}`}>{day}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
