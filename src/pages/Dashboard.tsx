import { useState, useCallback, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { DraggableWidget } from '../components/dashboard/DraggableWidget';
import type { WidgetRect } from '../components/dashboard/DraggableWidget';
import {
  CalendarWidget,
  ClockWidget,
  PomodoroWidget,
  TaskOverviewWidget,
  ProjectsWidget,
  ChatTopicsWidget,
  OKRWidget,
} from '../components/dashboard';

const LAYOUT_KEY = 'dashboard-layout';

export interface WidgetItem {
  id: string;
  rect: WidgetRect;
}

interface WidgetMeta {
  id: string;
  name: string;
  component: React.ReactNode;
  defaultRect: WidgetRect;
}

const ALL_WIDGETS: WidgetMeta[] = [
  { id: 'pomodoro', name: 'Pomodoro', component: <PomodoroWidget />, defaultRect: { x: 0, y: 2, w: 662, h: 178 } },
  { id: 'okr', name: 'OKRs', component: <OKRWidget />, defaultRect: { x: 0, y: 197, w: 344, h: 274 } },
  { id: 'calendar', name: 'Calendar', component: <CalendarWidget />, defaultRect: { x: 369, y: 203, w: 292, h: 257 } },
  { id: 'clock', name: 'Clock', component: <ClockWidget />, defaultRect: { x: 369, y: 500, w: 292, h: 218 } },
  { id: 'projects', name: 'Projects', component: <ProjectsWidget />, defaultRect: { x: 691, y: 8, w: 371, h: 448 } },
  { id: 'chat-topics', name: 'AI Chat', component: <ChatTopicsWidget />, defaultRect: { x: 691, y: 472, w: 371, h: 232 } },
  { id: 'tasks', name: 'Tasks', component: <TaskOverviewWidget />, defaultRect: { x: 0, y: 486, w: 190, h: 232 } },
];

const WIDGET_MAP: Record<string, React.ReactNode> = {};
ALL_WIDGETS.forEach((w) => { WIDGET_MAP[w.id] = w.component; });

const DEFAULT_LAYOUT: WidgetItem[] = ALL_WIDGETS.map((w) => ({ id: w.id, rect: { ...w.defaultRect } }));
const VALID_WIDGET_IDS = new Set(ALL_WIDGETS.map((w) => w.id));

function loadLayout(): WidgetItem[] {
  try {
    const saved = localStorage.getItem(LAYOUT_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as WidgetItem[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const filtered = parsed.filter((w) => VALID_WIDGET_IDS.has(w.id));
        const savedIds = new Set(filtered.map((w) => w.id));
        const missing = DEFAULT_LAYOUT.filter((w) => !savedIds.has(w.id));
        const merged = missing.length > 0 ? [...filtered, ...missing] : filtered;
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(merged));
        return merged;
      }
    }
  } catch {}
  return DEFAULT_LAYOUT;
}

function saveLayout(layout: WidgetItem[]) {
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
}

export function Dashboard() {
  const [layout, setLayout] = useState<WidgetItem[]>(loadLayout);
  const [showPicker, setShowPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback((l: WidgetItem[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveLayout(l), 500);
  }, []);

  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  const handleMove = useCallback((id: string, x: number, y: number) => {
    setLayout(prev => {
      const next = prev.map(item => item.id === id ? { ...item, rect: { ...item.rect, x, y } } : item);
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const handleResize = useCallback((id: string, rect: WidgetRect) => {
    setLayout(prev => {
      const next = prev.map(item => item.id === id ? { ...item, rect } : item);
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const handleRemove = useCallback((id: string) => {
    setLayout(prev => {
      const next = prev.filter(item => item.id !== id);
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const handleAdd = useCallback((id: string) => {
    setLayout(prev => {
      if (prev.find((w) => w.id === id)) return prev; // already added
      const widget = ALL_WIDGETS.find((w) => w.id === id);
      if (!widget) return prev;
      // Offset new widget to avoid overlap
      const offset = prev.length * 20;
      const next = [...prev, { id, rect: { ...widget.defaultRect, x: widget.defaultRect.x + offset, y: widget.defaultRect.y + offset } }];
      scheduleSave(next);
      return next;
    });
    setShowPicker(false);
  }, [scheduleSave]);

  const layoutIds = new Set(layout.map((w) => w.id));
  const availableWidgets = ALL_WIDGETS.filter((w) => !layoutIds.has(w.id));
  const maxY = layout.reduce((max, item) => Math.max(max, item.rect.y + item.rect.h), 0);

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 animate-fadeIn">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)]">Dashboard</h1>
          <button onClick={() => setShowPicker(!showPicker)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-[12px] border-2 border-[#0D0D0D] bg-white shadow-[3px_3px_0px_#0D0D0D] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#0D0D0D] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#0D0D0D] transition-all">
            <Plus className="w-3.5 h-3.5" /> Widgets
          </button>
        </div>

        {/* Widget picker dropdown */}
        {showPicker && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
            <div className="absolute right-4 top-14 z-50 w-56 p-2 rounded-[16px] border-2 border-[#0D0D0D] bg-white shadow-[6px_6px_0px_#0D0D0D] animate-fadeIn">
              {availableWidgets.length > 0 ? (
                <div className="space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)] px-2 pb-1">Add widget</p>
                  {availableWidgets.map((w) => (
                    <button key={w.id} onClick={() => handleAdd(w.id)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-bold rounded-[8px] border-2 border-transparent hover:border-[#0D0D0D] hover:bg-[var(--color-bg-secondary)] transition-all text-left"
                      title={`Add ${w.name} widget`}>
                      <span className="text-[var(--color-text-primary)]">{w.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--color-text-tertiary)] text-center py-3">All widgets are on the dashboard</p>
              )}
            </div>
          </>
        )}

        {/* Widget grid */}
        <div ref={containerRef} className="relative" style={{ minHeight: Math.max(500, maxY + 20) }}>
          {layout.filter(item => WIDGET_MAP[item.id]).map(item => (
            <DraggableWidget key={item.id} id={item.id} rect={item.rect} onMove={handleMove} onResize={handleResize} onRemove={handleRemove}>
              {WIDGET_MAP[item.id]}
            </DraggableWidget>
          ))}
        </div>
      </div>
    </div>
  );
}
