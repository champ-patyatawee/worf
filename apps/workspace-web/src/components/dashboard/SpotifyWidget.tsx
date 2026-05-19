import { useState, useEffect } from 'react';
import { Trash2, Play } from 'lucide-react';
import { useMediaPlayerStore } from '@/stores/mediaPlayerStore';
import { fetchSpotifyTitle } from '@/utils/fetchTitle';

const STORAGE_KEY = 'dashboard-spotify-links';

interface SavedLink {
  rawUrl: string;
  embedUrl: string;
  title?: string;
}

function extractSpotifyId(url: string): string | null {
  const match = url.match(/open\.spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/);
  if (!match) return null;
  const [, type, id] = match;
  return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator`;
}

function getSpotifyLabel(rawUrl: string): string {
  const m = rawUrl.match(/open\.spotify\.com\/(track|album|playlist|episode)\/[a-zA-Z0-9]+/);
  if (!m) return rawUrl;
  return m[1].charAt(0).toUpperCase() + m[1].slice(1); // Track, Album, Playlist, Episode
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

export function SpotifyWidget() {
  const [inputValue, setInputValue] = useState('');
  const [links, setLinks] = useState<SavedLink[]>(loadLinks);
  const activeItem = useMediaPlayerStore((s) => s.activeItem);
  const play = useMediaPlayerStore((s) => s.play);

  const isActive = activeItem?.type === 'spotify';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    const embedUrl = extractSpotifyId(trimmed);
    if (embedUrl) {
      // Add to saved links (avoid duplicates)
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
        fetchSpotifyTitle(trimmed).then((title) => {
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
    play({ type: 'spotify', embedUrl: link.embedUrl, rawUrl: link.rawUrl });
  };

  const handleDelete = (rawUrl: string) => {
    const updated = links.filter((l) => l.rawUrl !== rawUrl);
    setLinks(updated);
    saveLinks(updated);
    // If this was the active item, stop
    if (isActive && activeItem?.rawUrl === rawUrl) {
      useMediaPlayerStore.getState().stop();
    }
  };

  return (
    <div className="min-h-full p-4 flex flex-col" style={{ backgroundColor: '#1DB954' }}>
      {/* Title bar */}
      <div className="flex items-center gap-2 mb-3">
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-black" aria-hidden="true">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0z"/>
        </svg>
        <span className="text-xs font-semibold uppercase tracking-wide text-black">Spotify</span>
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Paste Spotify link..."
          className="flex-1 px-3 py-2 text-xs rounded-[8px] border-2 border-black/20 bg-white/80 focus:bg-white focus:outline-none focus:border-black/50 text-black placeholder:text-black/30 font-mono transition-all"
        />
        <button
          type="submit"
          disabled={!inputValue.trim()}
          className="text-xs font-bold uppercase px-3 py-2 rounded-[8px] border-2 border-black bg-black text-white hover:bg-black/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Embed
        </button>
      </form>

      {/* Saved links list */}
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {links.length === 0 && (
          <p className="text-xs text-black/50 text-center pt-6">
            No saved links yet
          </p>
        )}
        {links.map((link) => {
          const active = isActive && activeItem?.rawUrl === link.rawUrl;
          return (
            <div
              key={link.rawUrl}
              className={`
                flex items-center gap-2 px-2 py-1.5 rounded-[8px] cursor-pointer group
                border-2 transition-all text-xs font-mono
                ${active
                  ? 'bg-black/15 border-black/30 text-black font-semibold'
                  : 'bg-white/30 border-transparent text-black/70 hover:bg-white/50 hover:border-black/10'
                }
              `}
              onClick={() => handleClickLink(link)}
            >
              {/* Play button — always visible for active, on hover for inactive */}
              {active ? (
                <Play className="w-3 h-3 fill-black flex-shrink-0" />
              ) : (
                <Play className="w-3 h-3 fill-black/40 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
              <span className="truncate flex-1">{link.title || getSpotifyLabel(link.rawUrl)}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(link.rawUrl); }}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove"
              >
                <Trash2 className="w-3 h-3 text-black/40 hover:text-black/80" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
