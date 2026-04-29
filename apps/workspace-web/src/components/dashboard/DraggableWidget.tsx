import { useRef, useCallback } from 'react';

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
  children: React.ReactNode;
}

export function DraggableWidget({ id, rect, onMove, onResize, children }: DraggableWidgetProps) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    type: 'move' | 'resize';
    startX: number;
    startY: number;
    startX2: number;
    startY2: number;
    startW: number;
    startH: number;
  } | null>(null);

  const handleMoveStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragState.current = {
      type: 'move', startX: e.clientX, startY: e.clientY,
      startX2: rect.x, startY2: rect.y, startW: 0, startH: 0,
    };

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragState.current || dragState.current.type !== 'move') return;
      const dx = ev.clientX - dragState.current.startX;
      const dy = ev.clientY - dragState.current.startY;
      onMove(id, Math.max(0, dragState.current.startX2 + dx), Math.max(0, dragState.current.startY2 + dy));
    };

    const onMouseUp = () => {
      dragState.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [id, rect.x, rect.y, onMove]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = widgetRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    dragState.current = {
      type: 'resize', startX: e.clientX, startY: e.clientY,
      startX2: r.left, startY2: r.top, startW: r.width, startH: r.height,
    };

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragState.current || dragState.current.type !== 'resize') return;
      const dx = ev.clientX - dragState.current.startX;
      const dy = ev.clientY - dragState.current.startY;
      onResize(id, {
        x: rect.x, y: rect.y,
        w: Math.max(180, dragState.current.startW + dx),
        h: Math.max(80, dragState.current.startH + dy),
      });
    };

    const onMouseUp = () => {
      dragState.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [id, rect, onResize]);

  return (
    <div
      ref={widgetRef}
      className="absolute group border-2 border-[#0D0D0D] rounded-[16px] shadow-[6px_6px_0px_#0D0D0D] hover:shadow-[8px_8px_0px_#0D0D0D] transition-all"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        minWidth: 180,
        minHeight: 80,
      }}
    >
      {/* Clips content to border-radius */}
      <div className="absolute inset-0 overflow-hidden rounded-[16px]">
        <div className="h-full overflow-y-auto">
          {children}
        </div>
      </div>

      {/* Move handle */}
      <div
        onMouseDown={handleMoveStart}
        className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 w-5 h-5 flex items-center justify-center rounded-[3px] border-2 border-[#0D0D0D] bg-white shadow-[1px_1px_0px_#0D0D0D] cursor-move hover:bg-[var(--color-bg-hover)] transition-all"
        aria-label="Move widget"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeLinecap="round">
          <path d="M3 1L3 9M7 1L7 9M1 3L9 3M1 7L9 7" />
        </svg>
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleResizeStart}
        className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 w-5 h-5 flex items-center justify-center rounded-[3px] border-2 border-[#0D0D0D] bg-white shadow-[1px_1px_0px_#0D0D0D] cursor-nwse-resize hover:bg-[var(--color-bg-hover)] transition-all"
        aria-label="Resize widget"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeLinecap="round">
          <path d="M2 8L8 2" />
          <path d="M5 8L8 5" />
          <path d="M2 5L5 2" />
        </svg>
      </div>
    </div>
  );
}
