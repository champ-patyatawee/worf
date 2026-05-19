import { useRef, useEffect, useState, useCallback } from 'react';
import { X, Minus, Pause, Play, SkipBack, SkipForward, GripHorizontal } from 'lucide-react';
import { useMediaPlayerStore } from '@/stores/mediaPlayerStore';

function createEmbed(container: HTMLElement, type: 'spotify' | 'youtube', src: string) {
  const existing = container.querySelector('iframe');
  if (existing) existing.remove();

  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.setAttribute(
    'allow',
    type === 'spotify' ? 'encrypted-media; clipboard-write' : 'autoplay; encrypted-media'
  );
  iframe.title = type === 'spotify' ? 'Spotify Player' : 'YouTube Player';
  container.appendChild(iframe);
}

export function FloatingPlayer() {
  const activeItem = useMediaPlayerStore((s) => s.activeItem);
  const youtubePaused = useMediaPlayerStore((s) => s.youtubePaused);
  const stop = useMediaPlayerStore((s) => s.stop);
  const toggleYoutubePlayback = useMediaPlayerStore((s) => s.toggleYoutubePlayback);
  const nextYoutubeTrack = useMediaPlayerStore((s) => s.nextYoutubeTrack);
  const prevYoutubeTrack = useMediaPlayerStore((s) => s.prevYoutubeTrack);
  const containerRef = useRef<HTMLDivElement>(null);
  const embedRef = useRef<HTMLDivElement>(null);
  const miniRef = useRef<HTMLButtonElement>(null);
  const [minimized, setMinimized] = useState(false);

  // ── Drag state ──
  const [pos, setPos] = useState(() => {
    const saved = localStorage.getItem('floating-player-pos');
    if (saved) { try { return JSON.parse(saved); } catch {} }
    return { x: 16, y: 16 };
  });
  const posRef = useRef(pos);
  posRef.current = pos;

  // Shared drag logic
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, elX: 0, elY: 0 });

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current) return;
    setPos({
      x: dragStart.current.elX + (e.clientX - dragStart.current.x),
      y: dragStart.current.elY + (e.clientY - dragStart.current.y),
    });
  }, []);

  const onMouseUp = useCallback(() => {
    dragging.current = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    localStorage.setItem('floating-player-pos', JSON.stringify(posRef.current));
  }, [onMouseMove]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove]);

  const startDrag = useCallback((e: React.MouseEvent, el: HTMLElement | null) => {
    e.preventDefault();
    if (!el) return;
    dragging.current = true;
    const rect = el.getBoundingClientRect();
    dragStart.current = { x: e.clientX, y: e.clientY, elX: rect.left, elY: rect.top };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [onMouseMove, onMouseUp]);

  const handlePlayerMouseDown = useCallback((e: React.MouseEvent) => {
    startDrag(e, containerRef.current);
  }, [startDrag]);

  const handleMiniMouseDown = useCallback((e: React.MouseEvent) => {
    startDrag(e, miniRef.current);
  }, [startDrag]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove]);

  // Create/update iframe when activeItem changes
  useEffect(() => {
    if (!activeItem || !embedRef.current) return;
    createEmbed(embedRef.current, activeItem.type, activeItem.embedUrl);
  }, [activeItem]);

  if (!activeItem) return null;

  const isSpotify = activeItem.type === 'spotify';
  const isYoutube = activeItem.type === 'youtube';

  return (
    <>
      {/* Floating reopen button — shown when minimized */}
      {minimized && (
        <button
          ref={miniRef}
          onMouseDown={handleMiniMouseDown}
          onClick={() => setMinimized(false)}
          className="fixed z-50 flex items-center gap-2 px-3 py-2 rounded-[12px] border-2 border-[#0D0D0D] bg-white shadow-[4px_4px_0px_#0D0D0D] hover:shadow-[5px_5px_0px_#0D0D0D] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-grab active:cursor-grabbing select-none"
          style={{ left: pos.x, top: pos.y }}
          title="Show player"
        >
          {isSpotify && <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#1DB954]"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0z"/></svg>}
          {isYoutube && <svg viewBox="0 0 24 24" className="w-4 h-4 fill-red-500"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"/></svg>}
          <span className="text-xs font-bold text-[var(--color-text-primary)]">{isSpotify ? 'Spotify' : 'YouTube'}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] animate-pulse" />
        </button>
      )}

      {/* Full player — always in DOM, just hidden when minimized */}
      <div
        ref={containerRef}
        className="fixed z-50 flex flex-col rounded-[16px] border-2 border-[#0D0D0D] bg-white shadow-[6px_6px_0px_#0D0D0D] overflow-hidden select-none transition-opacity duration-200"
        style={{
          left: pos.x,
          top: pos.y,
          width: 320,
          opacity: minimized ? 0 : 1,
          pointerEvents: minimized ? 'none' : 'auto',
        }}
      >
        {/* Drag handle — header */}
        <div
          onMouseDown={handlePlayerMouseDown}
          className="flex items-center gap-2 px-3 py-2 bg-[var(--color-bg-secondary)] border-b-2 border-[#0D0D0D] cursor-grab active:cursor-grabbing"
        >
          <GripHorizontal className="w-3 h-3 text-[var(--color-text-tertiary)] flex-shrink-0" />
          {isSpotify && <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#1DB954]"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0z"/></svg>}
          {isYoutube && <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-red-500"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"/></svg>}
          <span className="text-xs font-bold text-[var(--color-text-primary)] flex-1">{isSpotify ? 'Spotify' : 'YouTube'}</span>
          <button onClick={() => setMinimized(true)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--color-bg-hover)]" aria-label="Minimize">
            <Minus className="w-3 h-3 text-[var(--color-text-tertiary)]" />
          </button>
          <button onClick={stop} className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--color-bg-hover)]" aria-label="Close">
            <X className="w-3 h-3 text-[var(--color-text-tertiary)]" />
          </button>
        </div>

        {/* Embed area */}
        <div ref={embedRef} style={{ height: isYoutube ? 180 : 80, backgroundColor: isYoutube ? '#000' : '#fff' }} />

        {/* YouTube controls */}
        {isYoutube && (
          <div className="flex items-center justify-center gap-3 px-3 py-2 bg-[var(--color-bg-secondary)] border-t-2 border-[#0D0D0D]">
            <button onClick={prevYoutubeTrack} className="w-7 h-7 flex items-center justify-center rounded-full border-2 border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)]" aria-label="Previous">
              <SkipBack className="w-3 h-3 text-[var(--color-text-secondary)]" />
            </button>
            <button onClick={toggleYoutubePlayback} className="w-8 h-8 flex items-center justify-center rounded-full border-2 border-[var(--color-border-primary)] bg-[var(--color-accent-primary)] text-white hover:opacity-90" aria-label={youtubePaused ? 'Play' : 'Pause'}>
              {youtubePaused ? <Play className="w-3.5 h-3.5 fill-white ml-0.5" /> : <Pause className="w-3.5 h-3.5 fill-white" />}
            </button>
            <button onClick={nextYoutubeTrack} className="w-7 h-7 flex items-center justify-center rounded-full border-2 border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)]" aria-label="Next">
              <SkipForward className="w-3 h-3 text-[var(--color-text-secondary)]" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
