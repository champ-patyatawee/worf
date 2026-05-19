import { create } from 'zustand';
import { pauseYoutube, resumeYoutube, nextYoutube, prevYoutube } from '@/utils/mediaPlayer';

export interface ActiveItem {
  type: 'spotify' | 'youtube';
  embedUrl: string;
  rawUrl: string;
}

interface MediaPlayerState {
  activeItem: ActiveItem | null;
  youtubePaused: boolean;
  play: (item: ActiveItem) => void;
  stop: () => void;
  toggleYoutubePlayback: () => void;
  nextYoutubeTrack: () => void;
  prevYoutubeTrack: () => void;
}

export const useMediaPlayerStore = create<MediaPlayerState>()((set, get) => ({
  activeItem: null,
  youtubePaused: false,

  play: (item: ActiveItem) => {
    set({ activeItem: item, youtubePaused: false });
  },

  stop: () => {
    set({ activeItem: null, youtubePaused: false });
  },

  toggleYoutubePlayback: () => {
    const { youtubePaused } = get();
    if (youtubePaused) resumeYoutube();
    else pauseYoutube();
    set({ youtubePaused: !youtubePaused });
  },

  nextYoutubeTrack: () => { nextYoutube(); },
  prevYoutubeTrack: () => { prevYoutube(); },
}));
