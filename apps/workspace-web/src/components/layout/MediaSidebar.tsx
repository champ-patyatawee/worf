import { useState, useEffect } from 'react';
import { PanelRightClose, PanelRightOpen, Trash2, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { cn } from '@/utils/cn';
import { mountSpotifySidebar, mountYoutubeSidebar } from '@/utils/mediaPlayer';
import { useMediaPlayerStore } from '@/stores/mediaPlayerStore';

const SIDEBAR_WIDTH = 380;

export function MediaSidebar() {
  const activeItem = useMediaPlayerStore((s) => s.activeItem);
  const youtubePaused = useMediaPlayerStore((s) => s.youtubePaused);
  const stop = useMediaPlayerStore((s) => s.stop);
  const toggleYoutubePlayback = useMediaPlayerStore((s) => s.toggleYoutubePlayback);
  const nextYoutubeTrack = useMediaPlayerStore((s) => s.nextYoutubeTrack);
  const prevYoutubeTrack = useMediaPlayerStore((s) => s.prevYoutubeTrack);
  const [isOpen, setIsOpen] = useState(false);

  const hasMedia = !!activeItem;

  // Auto-open when media starts, auto-close when cleared
  useEffect(() => {
    if (activeItem) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [activeItem]);

  // Mount/unmount iframe when activeItem changes
  useEffect(() => {
    if (!activeItem) return;
    if (activeItem.type === 'spotify') {
      mountSpotifySidebar(activeItem.embedUrl);
    } else if (activeItem.type === 'youtube') {
      mountYoutubeSidebar(activeItem.embedUrl);
    }
  }, [activeItem]);

  const isSpotify = activeItem?.type === 'spotify';
  const isYoutube = activeItem?.type === 'youtube';

  return (
    <>
      {/* Sidebar panel with toggle button on its left edge */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full z-40 flex flex-col transition-transform duration-200 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{
          width: SIDEBAR_WIDTH,
          backgroundColor: 'var(--color-bg-primary)',
          borderLeft: '2px solid var(--color-border-primary)',
        }}
      >
        {/* Toggle button — sticks to left edge of panel */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute -left-7 top-1/2 -translate-y-1/2 w-7 h-14 flex items-center justify-center rounded-l-[8px] border-2 border-r-0 border-[#0D0D0D] bg-white shadow-[-2px_2px_0px_#0D0D0D] hover:bg-[var(--color-bg-hover)] transition-all"
          style={{ borderRight: 'none' }}
          aria-label={isOpen ? 'Close media player' : 'Open media player'}
        >
          <PanelRightClose className={`w-4 h-4 text-[var(--color-text-secondary)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b-2 border-[var(--color-border-primary)] flex-shrink-0">
          <div className="flex items-center gap-2">
            {isSpotify && <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#1DB954]"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0z"/></svg>}
            {isYoutube && <svg viewBox="0 0 24 24" className="w-4 h-4 fill-red-500"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"/></svg>}
            <span className="text-sm font-bold text-[var(--color-text-primary)]">{hasMedia ? (isSpotify ? 'Spotify' : 'YouTube') : 'Now Playing'}</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-[var(--color-bg-hover)] transition-colors"
            aria-label="Close"
          >
            <PanelRightOpen className="w-4 h-4 text-[var(--color-text-secondary)]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col p-4 overflow-y-auto">
          {!hasMedia && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <p className="text-sm text-[var(--color-text-tertiary)]">No media playing</p>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Embed a link from the Dashboard widgets</p>
            </div>
          )}

          {hasMedia && (
            <>
              <p className="text-xs font-semibold text-[var(--color-text-tertiary)] mb-3 uppercase tracking-wide">Now Playing</p>
              <div
                id={isSpotify ? 'spotify-sidebar-container' : 'youtube-sidebar-container'}
                className="flex-1 rounded-[12px] overflow-hidden border-2 border-[var(--color-border-primary)]"
                style={isYoutube ? { backgroundColor: 'black', minHeight: 200 } : { minHeight: 152 }}
              />
              {isYoutube && (
                <div className="flex items-center justify-center gap-3 mt-3">
                  <button onClick={prevYoutubeTrack} className="w-8 h-8 flex items-center justify-center rounded-full border-2 border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors" aria-label="Previous">
                    <SkipBack className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                  </button>
                  <button onClick={toggleYoutubePlayback} className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-[var(--color-border-primary)] bg-[var(--color-accent-primary)] text-white hover:opacity-90 transition-opacity" aria-label={youtubePaused ? 'Play' : 'Pause'}>
                    {youtubePaused ? <Play className="w-4 h-4 fill-white ml-0.5" /> : <Pause className="w-4 h-4 fill-white" />}
                  </button>
                  <button onClick={nextYoutubeTrack} className="w-8 h-8 flex items-center justify-center rounded-full border-2 border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors" aria-label="Next">
                    <SkipForward className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                  </button>
                </div>
              )}
              <button onClick={stop} className="self-end mt-3 text-xs font-bold uppercase px-3 py-1.5 rounded-[6px] border-2 border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] transition-all">
                Stop
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
