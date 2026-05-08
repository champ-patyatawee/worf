import { create } from 'zustand';
import { api } from '@/services/api';

export interface ChatSession {
  id: string;
  userId: string;
  title?: string;
  modelId?: string;
  promptTemplateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface ChatSessionState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;

  fetchSessions: () => Promise<void>;
  createSession: (data?: { title?: string; modelId?: string; promptTemplateId?: string }) => Promise<ChatSession>;
  updateSession: (id: string, data: { title?: string; modelId?: string; promptTemplateId?: string }) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  setActiveSession: (id: string | null) => void;
  fetchMessages: (sessionId: string) => Promise<void>;
  sendMessage: (sessionId: string, content: string, toolName?: string, toolParams?: Record<string, unknown>, toolContext?: string) => Promise<void>;
}

export const useChatSessionStore = create<ChatSessionState>((set) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,

  fetchSessions: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<{ success: boolean; data: ChatSession[] }>('/api/chat-sessions');
      if (response.success) {
        set({ sessions: response.data, isLoading: false });
      } else {
        set({ error: 'Failed to fetch chat sessions', isLoading: false });
      }
    } catch (err) {
      console.error('[ChatSessionStore] Failed to fetch sessions:', err);
      set({ error: 'Failed to fetch chat sessions', isLoading: false });
    }
  },

  createSession: async (data) => {
    try {
      const response = await api.post<{ success: boolean; data: ChatSession }>('/api/chat-sessions', data || {});
      if (response.success) {
        set((state) => ({
          sessions: [response.data, ...state.sessions],
          activeSessionId: response.data.id,
        }));
        return response.data;
      }
      throw new Error('Failed to create session');
    } catch (err) {
      console.error('[ChatSessionStore] Failed to create session:', err);
      throw err;
    }
  },

  updateSession: async (id, data) => {
    try {
      const response = await api.put<{ success: boolean; data: ChatSession }>(`/api/chat-sessions/${id}`, data);
      if (response.success) {
        set((state) => ({
          sessions: state.sessions.map((s) => (s.id === id ? response.data : s)),
        }));
      }
    } catch (err) {
      console.error('[ChatSessionStore] Failed to update session:', err);
    }
  },

  deleteSession: async (id) => {
    try {
      await api.delete(`/api/chat-sessions/${id}`);
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== id),
        activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
        messages: state.activeSessionId === id ? [] : state.messages,
      }));
    } catch (err) {
      console.error('[ChatSessionStore] Failed to delete session:', err);
    }
  },

  setActiveSession: (id) => {
    set({ activeSessionId: id, messages: [] });
  },

  fetchMessages: async (sessionId) => {
    try {
      const response = await api.get<{ success: boolean; data: { messages: ChatMessage[]; pagination?: any } }>(
        `/api/chat-sessions/${sessionId}/messages`
      );
      if (response.success) {
        set({ messages: response.data.messages });
      }
    } catch (err) {
      console.error('[ChatSessionStore] Failed to fetch messages:', err);
    }
  },

  sendMessage: async (sessionId, content, toolName?: string, toolParams?: Record<string, unknown>, toolContext?: string) => {
    set({ isSending: true, error: null });

    // Optimistic update: show user message immediately
    const optimisticId = `opt-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      chatId: sessionId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      messages: [...state.messages, optimisticMessage],
    }));

    try {
      const response = await api.post<{
        success: boolean;
        data: {
          userMessage: ChatMessage;
          assistantMessage: ChatMessage | null;
          error?: string;
        };
      }>(`/api/chat-sessions/${sessionId}/messages`, {
        content,
        ...(toolName ? { toolName, toolParams: toolParams || {} } : {}),
        ...(toolContext ? { toolContext } : {}),
      });

      if (response.success) {
        const { userMessage, assistantMessage, error } = response.data;
        // Replace optimistic message with real one, add assistant message
        // Only update messages — no sessions update to avoid re-render cascade
        set((state) => ({
          messages: [
            ...state.messages.filter((m) => m.id !== optimisticId),
            userMessage,
            ...(assistantMessage ? [assistantMessage] : []),
          ],
          isSending: false,
          error: error || null,
        }));
      }
    } catch (err) {
      console.error('[ChatSessionStore] Failed to send message:', err);
      // Remove optimistic message on error
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== optimisticId),
        isSending: false,
        error: 'Failed to send message',
      }));
    }
  },
}));
