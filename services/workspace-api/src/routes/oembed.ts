import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/oembed?url=...
 * Proxies oEmbed requests to avoid CORS issues.
 * Falls back to provider-specific endpoints and YouTube RSS feeds.
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    const isYoutube = /youtube\.com|youtu\.be/.test(url);
    const isSpotify = /spotify\.com/.test(url);

    if (!isYoutube && !isSpotify) {
      return res.status(400).json({ error: 'Only YouTube and Spotify URLs are supported' });
    }

    // —— 1. Try noembed (works for YouTube videos) ——
    try {
      const noembedRes = await fetch(
        `https://noembed.com/embed?url=${encodeURIComponent(url)}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (noembedRes.ok) {
        const data = await noembedRes.json();
        if (!data.error && data.title) {
          return res.json(data);
        }
      }
    } catch { /* fall through */ }

    // —— 2. Direct provider oEmbed ——
    if (isSpotify) {
      try {
        const spotifyRes = await fetch(
          `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (spotifyRes.ok) {
          const data = await spotifyRes.json();
          if (data.title) return res.json(data);
        }
      } catch { /* fall through */ }
    }

    // —— 3. YouTube RSS feed (works for playlists) ——
    if (isYoutube) {
      const playlistMatch = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
      if (playlistMatch) {
        try {
          const rssRes = await fetch(
            `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistMatch[1]}`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (rssRes.ok) {
            const xml = await rssRes.text();
            // Extract title from <title> tag (first one is the playlist title)
            const titleMatch = xml.match(/<title>([^<]+)<\/title>/);
            if (titleMatch) {
              return res.json({ title: titleMatch[1] });
            }
          }
        } catch { /* fall through */ }
      }
    }

    return res.json({ title: null });
  })
);

export default router;
