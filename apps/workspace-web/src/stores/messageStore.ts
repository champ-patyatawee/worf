import { create } from 'zustand';
import type { Message } from '@/types';

interface MessageState {
  messages: Record<string, Message[]>;
  isLoading: boolean;
  isLoadingMore: Record<string, boolean>;
  isLoadingNewer: Record<string, boolean>;
  hasMore: Record<string, boolean>;
  hasNewer: Record<string, boolean>;
  error: string | null;

  fetchMessages: (channelId: string) => Promise<void>;
  fetchMoreMessages: (channelId: string, before?: string) => Promise<void>;
  fetchNewerMessages: (channelId: string, after?: string) => Promise<void>;
  addMessage: (channelId: string, message: Message) => void;
  updateMessage: (channelId: string, message: Message) => void;
  removeMessage: (channelId: string, messageId: string) => void;
  clearMessages: (channelId: string) => void;
  incrementThreadCount: (channelId: string, parentMessageId: string) => void;
  setHasMore: (channelId: string, value: boolean) => void;
  setHasNewer: (channelId: string, value: boolean) => void;
  setLoadingMore: (channelId: string, value: boolean) => void;
  setLoadingNewer: (channelId: string, value: boolean) => void;
}

export const useMessageStore = create<MessageState>()((set, get) => ({
  messages: {},
  isLoading: false,
  isLoadingMore: {},
  isLoadingNewer: {},
  hasMore: {},
  hasNewer: {},
  error: null,

  fetchMessages: async (channelId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { api } = await import('@/services/api');
      const response = await api.getChannelMessages(channelId, { limit: 5 });
      const { data } = response as { success: boolean; data: { messages: any[]; pagination: any } };
      const transformedMessages = data.messages
        .filter((msg) => !msg.threadId)
        .map((msg) => ({
          ...msg,
          images: msg.chatImages || [],
          reactions: msg.reactions || [],
          threadCount: msg._count?.replies || 0,
        }))
        .reverse();
      set((state) => ({
        messages: { ...state.messages, [channelId]: transformedMessages },
        hasMore: { ...state.hasMore, [channelId]: data.pagination?.hasMore ?? false },
        hasNewer: { ...state.hasNewer, [channelId]: false },
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch messages',
        isLoading: false,
      });
    }
  },

  fetchMoreMessages: async (channelId: string, before?: string) => {
    const state = get();
    console.log('[messageStore] fetchMoreMessages called', { channelId, before, isLoadingMore: state.isLoadingMore[channelId], hasMore: state.hasMore[channelId] });
    if (state.isLoadingMore[channelId] || !state.hasMore[channelId]) {
      console.log('[messageStore] fetchMoreMessages ABORTED', { isLoadingMore: state.isLoadingMore[channelId], hasMore: state.hasMore[channelId] });
      return;
    }

    // Get oldest message timestamp directly from store to avoid stale closure issues
    // messages array is stored NEWEST first (index 0 = newest)
    // After prepending older messages, messages[0] is the OLDEST we just added
    const currentMessages = state.messages[channelId] || [];
    const oldestTimestamp = currentMessages[0]?.createdAt;
    console.log('[messageStore] oldest timestamp from store:', oldestTimestamp, '(from', currentMessages.length, 'messages, first msg id:', currentMessages[0]?.id, ')');

    // Use oldest timestamp from store, not the 'before' param which may be stale
    const timestampForApi = typeof oldestTimestamp === 'string' ? oldestTimestamp : undefined;

    set((s) => ({ isLoadingMore: { ...s.isLoadingMore, [channelId]: true } }));
    try {
      const { api } = await import('@/services/api');
      const response = await api.getChannelMessages(channelId, { before: timestampForApi, limit: 5 });
      const { data } = response as { success: boolean; data: { messages: any[]; pagination: any } };
      console.log('[messageStore] API returned', { messageCount: data.messages.length, hasMore: data.pagination?.hasMore });
      
      set((s) => {
        // All filtering happens inside set() to ensure fresh state
        const currentIds = new Set((s.messages[channelId] || []).map((m: Message) => m.id));
        
        const filteredMessages = data.messages
          .filter((msg) => !msg.threadId && !currentIds.has(msg.id))
          .map((msg) => ({
            ...msg,
            images: msg.chatImages || [],
            reactions: msg.reactions || [],
            threadCount: msg._count?.replies || 0,
          }))
          .reverse();
        
        console.log('[messageStore] set called', { 
          filteredCount: filteredMessages.length,
          newTotal: filteredMessages.length + (s.messages[channelId] || []).length 
        });
        
        return {
          messages: {
            ...s.messages,
            [channelId]: [...filteredMessages, ...(s.messages[channelId] || [])],
          },
          hasMore: { ...s.hasMore, [channelId]: data.pagination?.hasMore ?? false },
          isLoadingMore: { ...s.isLoadingMore, [channelId]: false },
        };
      });
    } catch (error) {
      set((s) => ({ isLoadingMore: { ...s.isLoadingMore, [channelId]: false } }));
    }
  },

  fetchNewerMessages: async (channelId: string, after?: string) => {
    const state = get();
    if (state.isLoadingNewer[channelId] || !state.hasNewer[channelId]) {
      return;
    }

    if (typeof after !== 'string') {
      after = undefined;
    }

    set((s) => ({ isLoadingNewer: { ...s.isLoadingNewer, [channelId]: true } }));
    try {
      const { api } = await import('@/services/api');
      const response = await api.getChannelMessages(channelId, { after, limit: 5 });
      const { data } = response as { success: boolean; data: { messages: any[]; pagination: any } };
      set((s) => {
        const currentIds = new Set((s.messages[channelId] || []).map((m: Message) => m.id));
        const filteredMessages = data.messages
          .filter((msg) => !msg.threadId && !currentIds.has(msg.id))
          .map((msg) => ({
            ...msg,
            images: msg.chatImages || [],
            reactions: msg.reactions || [],
            threadCount: msg._count?.replies || 0,
          }))
          .reverse();
        return {
          messages: {
            ...s.messages,
            [channelId]: [...filteredMessages, ...(s.messages[channelId] || [])],
          },
          hasNewer: { ...s.hasNewer, [channelId]: data.pagination?.hasMore ?? false },
          isLoadingNewer: { ...s.isLoadingNewer, [channelId]: false },
        };
      });
    } catch (error) {
      set((s) => ({ isLoadingNewer: { ...s.isLoadingNewer, [channelId]: false } }));
    }
  },

  addMessage: (channelId: string, message: Message) => {
    if ((message as any).threadId) {
      return;
    }
    set((state) => {
      const channelMessages = state.messages[channelId] || [];
      const exists = channelMessages.some((m) => m.id === message.id);
      if (exists) {
        return state;
      }
      return {
        messages: {
          ...state.messages,
          [channelId]: [...channelMessages, message],
        },
      };
    });
  },

  updateMessage: (channelId: string, message: Message) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: (state.messages[channelId] || []).map((m) =>
          m.id === message.id ? message : m
        ),
      },
    }));
  },

  removeMessage: (channelId: string, messageId: string) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: (state.messages[channelId] || []).filter(
          (m) => m.id !== messageId
        ),
      },
    }));
  },

  clearMessages: (channelId: string) => {
    set((state) => {
      const { [channelId]: _, ...rest } = state.messages;
      const { [channelId]: __, ...restHasMore } = state.hasMore;
      const { [channelId]: ___, ...restLoadingMore } = state.isLoadingMore;
      const { [channelId]: ____, ...restHasNewer } = state.hasNewer;
      const { [channelId]: _____, ...restLoadingNewer } = state.isLoadingNewer;
      return { 
        messages: rest, 
        hasMore: restHasMore, 
        isLoadingMore: restLoadingMore,
        hasNewer: restHasNewer,
        isLoadingNewer: restLoadingNewer,
      };
    });
  },

  incrementThreadCount: (channelId: string, parentMessageId: string) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: (state.messages[channelId] || []).map((m) =>
          m.id === parentMessageId ? { ...m, threadCount: (m.threadCount || 0) + 1 } : m
        ),
      },
    }));
  },

  setHasMore: (channelId: string, value: boolean) => {
    set((state) => ({
      hasMore: { ...state.hasMore, [channelId]: value },
    }));
  },

  setHasNewer: (channelId: string, value: boolean) => {
    set((state) => ({
      hasNewer: { ...state.hasNewer, [channelId]: value },
    }));
  },

  setLoadingMore: (channelId: string, value: boolean) => {
    set((state) => ({
      isLoadingMore: { ...state.isLoadingMore, [channelId]: value },
    }));
  },

  setLoadingNewer: (channelId: string, value: boolean) => {
    set((state) => ({
      isLoadingNewer: { ...state.isLoadingNewer, [channelId]: value },
    }));
  },
}));