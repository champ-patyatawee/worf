import { create } from 'zustand';

interface DMUnreadCount {
  [userId: string]: number;
}

interface DMConversation {
  userId: string;
  lastMessage?: {
    content: string;
    createdAt: Date;
    senderId: string;
  };
  updatedAt: Date;
}

interface DMState {
  unreadCounts: DMUnreadCount;
  conversations: DMConversation[];
  
  incrementUnread: (userId: string) => void;
  clearUnread: (userId: string) => void;
  setUnreadCount: (userId: string, count: number) => void;
  addConversation: (conversation: DMConversation) => void;
  updateConversation: (userId: string, lastMessage: { content: string; createdAt: Date; senderId: string }) => void;
  getTotalUnread: () => number;
}

export const useDMStore = create<DMState>()((set, get) => ({
  unreadCounts: {},
  conversations: [],

  incrementUnread: (userId: string) => {
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [userId]: (state.unreadCounts[userId] || 0) + 1,
      },
    }));
  },

  clearUnread: (userId: string) => {
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [userId]: 0,
      },
    }));
  },

  setUnreadCount: (userId: string, count: number) => {
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [userId]: count,
      },
    }));
  },

  addConversation: (conversation: DMConversation) => {
    set((state) => {
      const exists = state.conversations.some((c) => c.userId === conversation.userId);
      if (exists) {
        return state;
      }
      return {
        conversations: [conversation, ...state.conversations],
      };
    });
  },

  updateConversation: (userId: string, lastMessage: { content: string; createdAt: Date; senderId: string }) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.userId === userId
          ? { ...c, lastMessage, updatedAt: new Date() }
          : c
      ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    }));
  },

  getTotalUnread: () => {
    const counts = get().unreadCounts;
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
  },
}));
