/**
 * Holds the hidden YouTube iframes for persistent playback
 * across page navigation. Spotify is handled by MediaSidebar.
 */
export function PersistentMediaPlayer() {
  return (
    <div
      id="persistent-media-container"
      className="fixed"
      style={{ width: 1, height: 1, bottom: 0, left: 0, overflow: 'hidden', zIndex: -1 }}
    />
  );
}
