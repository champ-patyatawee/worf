import { useState, useCallback, useEffect, useRef } from 'react';
import { DraggableWidget } from '@/components/dashboard/DraggableWidget';
import type { WidgetRect } from '@/components/dashboard/DraggableWidget';
import {
  CalendarWidget,
  ClockWidget,
  PomodoroWidget,
  TaskOverviewWidget,
  ProjectsWidget,
  TeamMembersWidget,
  NoteOverviewWidget,
  SpotifyWidget,
  YouTubeMusicWidget,
} from '@/components/dashboard';

const LAYOUT_KEY = 'dashboard-layout';

export interface WidgetItem {
  id: string;
  rect: WidgetRect;
}

const DEFAULT_LAYOUT: WidgetItem[] = [
  { id: 'pomodoro', rect: { x: 0, y: 2, w: 662, h: 178 } },
  { id: 'calendar', rect: { x: 0, y: 197, w: 344, h: 274 } },
  { id: 'clock', rect: { x: 369, y: 203, w: 292, h: 257 } },
  { id: 'projects', rect: { x: 691, y: 8, w: 371, h: 448 } },
  { id: 'team', rect: { x: 1080, y: 8, w: 307, h: 446 } },
  { id: 'tasks', rect: { x: 0, y: 486, w: 190, h: 232 } },
  { id: 'notes', rect: { x: 201, y: 489, w: 361, h: 237 } },
  { id: 'spotify', rect: { x: 577, y: 483, w: 433, h: 249 } },
  { id: 'ytmusic', rect: { x: 1026, y: 492, w: 400, h: 231 } },
];

function loadLayout(): WidgetItem[] {
  try {
    const saved = localStorage.getItem(LAYOUT_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as WidgetItem[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge in any new default widgets that aren't in the saved layout
        const savedIds = new Set(parsed.map((w) => w.id));
        const missing = DEFAULT_LAYOUT.filter((w) => !savedIds.has(w.id));
        if (missing.length > 0) {
          const merged = [...parsed, ...missing];
          localStorage.setItem(LAYOUT_KEY, JSON.stringify(merged));
          return merged;
        }
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_LAYOUT;
}

function saveLayout(layout: WidgetItem[]) {
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
}

const WIDGET_MAP: Record<string, React.ReactNode> = {
  calendar: <CalendarWidget />,
  clock: <ClockWidget />,
  tasks: <TaskOverviewWidget />,
  projects: <ProjectsWidget />,
  pomodoro: <PomodoroWidget />,
  team: <TeamMembersWidget />,
  notes: <NoteOverviewWidget />,
  spotify: <SpotifyWidget />,
  ytmusic: <YouTubeMusicWidget />,
};

export function Dashboard() {
  const [layout, setLayout] = useState<WidgetItem[]>(loadLayout);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback((l: WidgetItem[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveLayout(l), 500);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const handleMove = useCallback((id: string, x: number, y: number) => {
    setLayout(prev => {
      const next = prev.map(item =>
        item.id === id ? { ...item, rect: { ...item.rect, x, y } } : item
      );
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const handleResize = useCallback((id: string, rect: WidgetRect) => {
    setLayout(prev => {
      const next = prev.map(item =>
        item.id === id ? { ...item, rect } : item
      );
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const maxY = layout.reduce((max, item) => Math.max(max, item.rect.y + item.rect.h), 0);

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 animate-fadeIn">
      <div className="max-w-[1400px] mx-auto">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)] mb-4">
          Dashboard
        </h1>

        <div
          ref={containerRef}
          className="relative"
          style={{ minHeight: Math.max(500, maxY + 20) }}
        >
          {layout.map(item => (
            <DraggableWidget
              key={item.id}
              id={item.id}
              rect={item.rect}
              onMove={handleMove}
              onResize={handleResize}
            >
              {WIDGET_MAP[item.id]}
            </DraggableWidget>
          ))}
        </div>
      </div>
    </div>
  );
}
