import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export function PomodoroWidget() {
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [workDuration, setWorkDuration] = useState(25 * 60);
  const [breakDuration, setBreakDuration] = useState(25 * 60);
  const [editingWork, setEditingWork] = useState(false);
  const [editingBreak, setEditingBreak] = useState(false);

  // Load initial state from backend
  useEffect(() => {
    invoke<{
      mode: string;
      is_running: boolean;
      time_left: number;
      work_duration: number;
      break_duration: number;
    }>("get_pomodoro_state").then(state => {
      setMode(state.mode as 'work' | 'break');
      setIsRunning(state.is_running);
      setTimeLeft(state.time_left);
      setWorkDuration(state.work_duration);
      setBreakDuration(state.break_duration);
    }).catch(() => {});
  }, []);

  // Listen for ticks from backend
  useEffect(() => {
    const unsub = listen<{
      mode: string;
      is_running: boolean;
      time_left: number;
      work_duration: number;
      break_duration: number;
    }>("pomodoro-tick", (event) => {
      const s = event.payload;
      setMode(s.mode as 'work' | 'break');
      setIsRunning(s.is_running);
      setTimeLeft(s.time_left);
      setWorkDuration(s.work_duration);
      setBreakDuration(s.break_duration);
    });
    return () => { unsub.then(fn => fn()); };
  }, []);

  // Listen for completion
  useEffect(() => {
    const unsub = listen("pomodoro-complete", () => {
      // Backend handles mode switch and auto-start
      // We just need to play a beep for immediate feedback
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.3;
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
        setTimeout(() => ctx.close(), 500);
      } catch {}
    });
    return () => { unsub.then(fn => fn()); };
  }, []);

  const toggle = () => {
    if (isRunning) {
      invoke("stop_pomodoro").catch(() => {});
      setIsRunning(false);
    } else {
      invoke("start_pomodoro", {
        workMinutes: Math.round(workDuration / 60),
        breakMinutes: Math.round(breakDuration / 60),
      }).catch(() => {});
      // Don't set isRunning here — backend will send tick with updated state
    }
  };

  const reset = () => {
    invoke("stop_pomodoro").catch(() => {});
    setMode('work');
    setTimeLeft(workDuration);
    setIsRunning(false);
  };

  const setDuration = (target: 'work' | 'break', minutes: number) => {
    const seconds = Math.max(60, Math.min(3600, Math.round(minutes) * 60));
    if (target === 'work') {
      setWorkDuration(seconds);
      if (!isRunning && mode === 'work') setTimeLeft(seconds);
    } else {
      setBreakDuration(seconds);
      if (!isRunning && mode === 'break') setTimeLeft(seconds);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const total = mode === 'work' ? workDuration : breakDuration;
  const progress = ((total - timeLeft) / total) * 100;
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="min-h-full p-4 flex flex-col" style={{ backgroundColor: '#E9D5FF' }}>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Pomodoro</span>
        {mode === 'break' && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[var(--color-success)] text-white border border-[#0D0D0D]">Break</span>}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-[10px] font-bold text-[var(--color-text-tertiary)]">Work:</span>
          {editingWork ? (
            <input autoFocus type="number" min={1} max={60}
              defaultValue={Math.round(workDuration / 60)}
              onBlur={(e) => { setEditingWork(false); const v = parseInt(e.target.value); if (v > 0) setDuration('work', v); }}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingWork(false); }}
              className="w-10 text-[10px] font-bold px-1 py-0.5 rounded border text-center outline-none"
              style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-primary)', color: 'var(--color-text-primary)' }} />
          ) : (
            <span className="text-[10px] font-bold cursor-pointer hover:opacity-70" style={{ color: 'var(--color-text-secondary)' }}
              onClick={() => !isRunning && setEditingWork(true)}>{Math.round(workDuration / 60)}m</span>
          )}
          <span className="text-[10px] text-[var(--color-text-tertiary)] mx-0.5">/</span>
          <span className="text-[10px] font-bold text-[var(--color-text-tertiary)]">Break:</span>
          {editingBreak ? (
            <input autoFocus type="number" min={1} max={60}
              defaultValue={Math.round(breakDuration / 60)}
              onBlur={(e) => { setEditingBreak(false); const v = parseInt(e.target.value); if (v > 0) setDuration('break', v); }}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingBreak(false); }}
              className="w-10 text-[10px] font-bold px-1 py-0.5 rounded border text-center outline-none"
              style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-primary)', color: 'var(--color-text-primary)' }} />
          ) : (
            <span className="text-[10px] font-bold cursor-pointer hover:opacity-70" style={{ color: 'var(--color-text-secondary)' }}
              onClick={() => !isRunning && setEditingBreak(true)}>{Math.round(breakDuration / 60)}m</span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-center gap-4 flex-1">
        <div className="relative">
          <svg width="110" height="110" className="transform -rotate-90">
            <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="6" />
            <circle cx="55" cy="55" r={r} fill="none" stroke={mode === 'work' ? 'var(--color-accent-primary)' : 'var(--color-success)'} strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-500" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-2xl font-bold text-[var(--color-text-primary)]">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
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
