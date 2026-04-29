import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Channel } from '@/types';
import { api } from '@/services/api';

interface ChannelState {
  channels: Channel[];
  activeChannelId: string | null;
  unreadCounts: Record<string, number>;
  isLoading: boolean;
  error: string | null;

  fetchChannels: () => Promise<void>;
  setActiveChannel: (channelId: string) => void;
  markAsRead: (channelId: string) => void;
  addChannel: (channel: Channel) => void;
  updateChannel: (channel: Channel) => void;
  removeChannel: (channelId: string) => void;
  incrementUnread: (channelId: string) => void;
}

export const useChannelStore = create<ChannelState>()(
  persist(
    (set, get) => ({
      channels: [],
      activeChannelId: null,
      unreadCounts: {},
      isLoading: false,
      error: null,

      fetchChannels: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.getChannels();
          const { data } = response as { success: boolean; data: Channel[] };
          set({ channels: data, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch channels',
            isLoading: false,
          });
        }
      },

      setActiveChannel: (channelId: string) => {
        set({ activeChannelId: channelId });
        get().markAsRead(channelId);
      },

      markAsRead: (channelId: string) => {
        set((state) => ({
          unreadCounts: { ...state.unreadCounts, [channelId]: 0 },
        }));
      },

      addChannel: (channel: Channel) => {
        set((state) => ({
          channels: [...state.channels, channel],
        }));
      },

      updateChannel: (channel: Channel) => {
        set((state) => ({
          channels: state.channels.map((c) =>
            c.id === channel.id ? channel : c
          ),
        }));
      },

      removeChannel: (channelId: string) => {
        set((state) => ({
          channels: state.channels.filter((c) => c.id !== channelId),
          activeChannelId:
            state.activeChannelId === channelId ? null : state.activeChannelId,
        }));
      },

      incrementUnread: (channelId: string) => {
        set((state) => ({
          unreadCounts: {
            ...state.unreadCounts,
            [channelId]: (state.unreadCounts[channelId] || 0) + 1,
          },
        }));
      },
    }),
    {
      name: 'workspace-channels',
      partialize: (state) => ({
        activeChannelId: state.activeChannelId,
      }),
    }
  )
);
