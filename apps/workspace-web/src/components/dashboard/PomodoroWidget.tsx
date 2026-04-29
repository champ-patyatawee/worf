import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

const WORK = 25 * 60;
const BREAK = 5 * 60;

export function PomodoroWidget() {
  const [timeLeft, setTimeLeft] = useState(WORK);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearTimer(); setIsRunning(false);
            if (mode === 'work') { setMode('break'); setTimeLeft(BREAK); }
            else { setMode('work'); setTimeLeft(WORK); }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else clearTimer();
    return clearTimer;
  }, [isRunning, mode, clearTimer]);

  const toggle = () => setIsRunning(r => !r);
  const reset = () => { setIsRunning(false); setMode('work'); setTimeLeft(WORK); };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const total = mode === 'work' ? WORK : BREAK;
  const progress = ((total - timeLeft) / total) * 100;
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="min-h-full p-4 flex flex-col" style={{ backgroundColor: '#E9D5FF' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Pomodoro</span>
        {mode === 'break' && (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[var(--color-success)] text-white border border-[#0D0D0D]">Break</span>
        )}
      </div>
      <div className="flex items-center justify-center gap-4 flex-1">
        <div className="relative">
          <svg width="110" height="110" className="transform -rotate-90">
            <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="6" />
            <circle cx="55" cy="55" r={r} fill="none"
              stroke={mode === 'work' ? 'var(--color-accent-primary)' : 'var(--color-success)'}
              strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={offset}
              strokeLinecap="round" className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-2xl font-bold text-[var(--color-text-primary)]">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">{mode}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={toggle}
            className="w-9 h-9 flex items-center justify-center rounded-[8px] border-2 border-[#0D0D0D] bg-[var(--color-accent-primary)] text-white shadow-[3px_3px_0px_#0D0D0D] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#0D0D0D] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#0D0D0D] transition-all"
            aria-label={isRunning ? 'Pause' : 'Start'}>
            {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button onClick={reset}
            className="w-9 h-9 flex items-center justify-center rounded-[8px] border-2 border-[#0D0D0D] bg-white shadow-[3px_3px_0px_#0D0D0D] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#0D0D0D] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#0D0D0D] transition-all"
            aria-label="Reset">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
