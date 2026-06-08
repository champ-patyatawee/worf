import { useRef, useCallback } from 'react';
import { X } from 'lucide-react';

export interface WidgetRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DraggableWidgetProps {
  id: string;
  rect: WidgetRect;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, rect: WidgetRect) => void;
  onRemove: (id: string) => void;
  children: React.ReactNode;
}

export function DraggableWidget({ id, rect, onMove, onResize, onRemove, children }: DraggableWidgetProps) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    type: 'move' | 'resize';
    startX: number; startY: number;
    startX2: number; startY2: number;
    startW: number; startH: number;
  } | null>(null);

  const handleMoveStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const el = widgetRef.current;
    if (!el) return;
    const startLeft = parseInt(el.style.left) || 0;
    const startTop = parseInt(el.style.top) || 0;
    dragState.current = {
      type: 'move', startX: e.clientX, startY: e.clientY,
      startX2: startLeft, startY2: startTop, startW: 0, startH: 0,
    };
    const onMouseMove = (ev: MouseEvent) => {
      if (!dragState.current || dragState.current.type !== 'move' || !el) return;
      el.style.left = `${Math.max(0, dragState.current.startX2 + (ev.clientX - dragState.current.startX))}px`;
      el.style.top = `${Math.max(0, dragState.current.startY2 + (ev.clientY - dragState.current.startY))}px`;
    };
    const onMouseUp = () => {
      if (dragState.current && dragState.current.type === 'move' && el) {
        onMove(id, parseInt(el.style.left) || 0, parseInt(el.style.top) || 0);
      }
      dragState.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [id, onMove]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const el = widgetRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    dragState.current = {
      type: 'resize', startX: e.clientX, startY: e.clientY,
      startX2: r.left, startY2: r.top, startW: r.width, startH: r.height,
    };
    const onMouseMove = (ev: MouseEvent) => {
      if (!dragState.current || dragState.current.type !== 'resize' || !el) return;
      el.style.width = `${Math.max(180, dragState.current.startW + (ev.clientX - dragState.current.startX))}px`;
      el.style.height = `${Math.max(80, dragState.current.startH + (ev.clientY - dragState.current.startY))}px`;
    };
    const onMouseUp = () => {
      if (dragState.current && dragState.current.type === 'resize' && el) {
        onResize(id, { x: rect.x, y: rect.y, w: Math.max(180, parseInt(el.style.width) || dragState.current.startW), h: Math.max(80, parseInt(el.style.height) || dragState.current.startH) });
      }
      dragState.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [id, rect.x, rect.y, onResize]);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(id);
  };

  return (
    <div ref={widgetRef}
      className="absolute group border-2 border-[#0D0D0D] rounded-[16px] shadow-[6px_6px_0px_#0D0D0D] hover:shadow-[8px_8px_0px_#0D0D0D]"
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, minWidth: 180, minHeight: 80 }}>
      <div className="absolute inset-0 overflow-hidden rounded-[16px]">
        <div className="h-full overflow-y-auto">{children}</div>
      </div>
      {/* Move handle */}
      <div onMouseDown={handleMoveStart}
        className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 w-5 h-5 flex items-center justify-center rounded-[3px] border-2 border-[#0D0D0D] bg-white shadow-[1px_1px_0px_#0D0D0D] cursor-move hover:bg-[var(--color-bg-hover)]"
        aria-label="Move widget">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeLinecap="round">
          <path d="M3 1L3 9M7 1L7 9M1 3L9 3M1 7L9 7" />
        </svg>
      </div>
      {/* Remove button */}
      <button onClick={handleRemove}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 w-5 h-5 flex items-center justify-center rounded-[3px] border-2 border-[#0D0D0D] bg-white shadow-[1px_1px_0px_#0D0D0D] hover:bg-red-100 hover:text-red-500"
        aria-label="Remove widget">
        <X className="w-3 h-3" />
      </button>
      {/* Resize handle */}
      <div onMouseDown={handleResizeStart}
        className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 w-5 h-5 flex items-center justify-center rounded-[3px] border-2 border-[#0D0D0D] bg-white shadow-[1px_1px_0px_#0D0D0D] cursor-nwse-resize hover:bg-[var(--color-bg-hover)]"
        aria-label="Resize widget">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeLinecap="round">
          <path d="M2 8L8 2" /><path d="M5 8L8 5" /><path d="M2 5L5 2" />
        </svg>
      </div>
    </div>
  );
}
