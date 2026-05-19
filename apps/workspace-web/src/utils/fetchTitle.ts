/**
 * Fetches a human-readable title for YouTube and Spotify links.
 * Uses the backend API at the same base path as other API calls.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function getToken(): string | null {
  try {
    const stored = localStorage.getItem('workspace-auth');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed.state?.token || null;
  } catch {
    return null;
  }
}

function normalizeUrl(rawUrl: string): string | null {
  const video = rawUrl.match(
    /(?:music\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})|youtu\.be\/([a-zA-Z0-9_-]{11})/
  );
  if (video) {
    const id = video[1] || video[2];
    return `https://www.youtube.com/watch?v=${id}`;
  }
  const playlist = rawUrl.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (playlist) return `https://www.youtube.com/playlist?list=${playlist[1]}`;
  const spotify = rawUrl.match(/open\.spotify\.com\/(track|album|playlist|episode)\/[a-zA-Z0-9]+/);
  if (spotify) return `https://${spotify[0]}`;
  return null;
}

async function fetchTitle(rawUrl: string): Promise<string | null> {
  const url = normalizeUrl(rawUrl);
  if (!url) return null;

  const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  const fullUrl = `${base}/api/oembed?url=${encodeURIComponent(url)}`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(fullUrl, { headers });
    if (!res.ok) return null;
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return data.title || null;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

export async function fetchYoutubeTitle(rawUrl: string): Promise<string | null> {
  return fetchTitle(rawUrl);
}

export async function fetchSpotifyTitle(rawUrl: string): Promise<string | null> {
  return fetchTitle(rawUrl);
}
