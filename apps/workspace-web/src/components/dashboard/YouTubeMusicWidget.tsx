import { useState, useEffect } from 'react';
import { Trash2, Play } from 'lucide-react';
import { useMediaPlayerStore } from '@/stores/mediaPlayerStore';
import { fetchYoutubeTitle } from '@/utils/fetchTitle';

const STORAGE_KEY = 'dashboard-yt-links';

interface SavedLink {
  rawUrl: string;
  embedUrl: string;
  title?: string;
}

function buildEmbedUrl(url: string): string | null {
  const playlistMatch = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (playlistMatch) {
    return `https://www.youtube.com/embed/videoseries?list=${playlistMatch[1]}&autoplay=0&enablejsapi=1`;
  }
  const videoPatterns = [
    /(?:music\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:music\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of videoPatterns) {
    const match = url.match(pattern);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}?autoplay=0&enablejsapi=1`;
    }
  }
  return null;
}

function getLabel(rawUrl: string): string {
  if (rawUrl.includes('list=')) return 'Playlist';
  return 'Video';
}

function loadLinks(): SavedLink[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLinks(links: SavedLink[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

export function YouTubeMusicWidget() {
  const [inputValue, setInputValue] = useState('');
  const [links, setLinks] = useState<SavedLink[]>(loadLinks);
  const activeItem = useMediaPlayerStore((s) => s.activeItem);
  const play = useMediaPlayerStore((s) => s.play);

  const isActive = activeItem?.type === 'youtube';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    const embedUrl = buildEmbedUrl(trimmed);
    if (embedUrl) {
      const existing = links.find((l) => l.rawUrl === trimmed);
      let updated: SavedLink[];
      if (existing) {
        updated = links;
      } else {
        const newLink: SavedLink = { rawUrl: trimmed, embedUrl };
        updated = [newLink, ...links];
        setLinks(updated);
        saveLinks(updated);
        // Fetch title asynchronously
        fetchYoutubeTitle(trimmed).then((title) => {
          if (title) {
            setLinks((prev) => {
              const next = prev.map((l) =>
                l.rawUrl === trimmed ? { ...l, title } : l
              );
              saveLinks(next);
              return next;
            });
          }
        });
      }
      setInputValue('');
    }
  };

  const handleClickLink = (link: SavedLink) => {
    play({ type: 'youtube', embedUrl: link.embedUrl, rawUrl: link.rawUrl });
  };

  const handleDelete = (rawUrl: string) => {
    const updated = links.filter((l) => l.rawUrl !== rawUrl);
    setLinks(updated);
    saveLinks(updated);
    if (isActive && activeItem?.rawUrl === rawUrl) {
      useMediaPlayerStore.getState().stop();
    }
  };

  return (
    <div className="min-h-full p-4 flex flex-col" style={{ backgroundColor: '#282828' }}>
      {/* Title bar */}
      <div className="flex items-center gap-2 mb-3">
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-red-500" aria-hidden="true">
          <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"/>
        </svg>
        <span className="text-xs font-semibold uppercase tracking-wide text-white">YouTube</span>
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Paste YouTube link..."
          className="flex-1 px-3 py-2 text-xs rounded-[8px] border-2 border-white/10 bg-white/10 focus:bg-white/20 focus:outline-none focus:border-white/30 text-white placeholder:text-white/30 font-mono transition-all"
        />
        <button
          type="submit"
          disabled={!inputValue.trim()}
          className="text-xs font-bold uppercase px-3 py-2 rounded-[8px] border-2 border-white bg-white text-black hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Embed
        </button>
      </form>

      {/* Saved links list */}
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {links.length === 0 && (
          <p className="text-xs text-white/40 text-center pt-6">
            No saved links yet
          </p>
        )}
        {links.map((link) => {
          const active = isActive && activeItem?.rawUrl === link.rawUrl;
          const label = getLabel(link.rawUrl);
          return (
            <div
              key={link.rawUrl}
              className={`
                flex items-center gap-2 px-2 py-1.5 rounded-[8px] cursor-pointer group
                border-2 transition-all text-xs font-mono
                ${active
                  ? 'bg-white/15 border-white/30 text-white font-semibold'
                  : 'bg-white/5 border-transparent text-white/60 hover:bg-white/10 hover:border-white/10'
                }
              `}
              onClick={() => handleClickLink(link)}
            >
              {/* Play button — always visible for active, on hover for inactive */}
              {active ? (
                <Play className="w-3 h-3 fill-white flex-shrink-0" />
              ) : (
                <Play className="w-3 h-3 fill-white/40 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
              <span className="truncate flex-1">{link.title || getLabel(link.rawUrl)}</span>
              <span className="text-[9px] uppercase font-bold text-white/30 flex-shrink-0">{label}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(link.rawUrl); }}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove"
              >
                <Trash2 className="w-3 h-3 text-white/30 hover:text-white/70" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
