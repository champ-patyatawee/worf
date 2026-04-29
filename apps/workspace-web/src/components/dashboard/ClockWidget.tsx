import { useState, useEffect } from 'react';

export function ClockWidget() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(id); }, []);

  const h = time.getHours();
  const m = time.getMinutes();
  const s = time.getSeconds();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;

  return (
    <div className="min-h-full p-4 flex flex-col items-center justify-center" style={{ backgroundColor: '#FBCFE8' }}>
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)] self-start mb-2">Clock</span>
      <div className="flex flex-col items-center flex-1 justify-center">
        <div className="flex items-baseline">
          <span className="font-mono text-5xl font-bold tracking-tight text-[var(--color-text-primary)]">
            {String(h12).padStart(2, '0')}:{String(m).padStart(2, '0')}
          </span>
          <span className="font-mono text-lg font-semibold text-[var(--color-text-secondary)] ml-0.5">
            :{String(s).padStart(2, '0')}
          </span>
        </div>
        <span className="text-xs font-bold uppercase mt-1 tracking-wider text-[var(--color-accent-primary)]">{ampm}</span>
        <span className="text-[11px] font-semibold text-[var(--color-text-tertiary)] mt-2">
          {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
      </div>
    </div>
  );
}
