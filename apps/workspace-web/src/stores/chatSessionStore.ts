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

function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem('workspace-auth');
    if (!stored) return null;
    return JSON.parse(stored).state?.token || null;
  } catch {
    return null;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

export const useChatSessionStore = create<ChatSessionState>((set, get) => ({
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

  sendMessage: async (sessionId, content, toolName?, toolParams?, toolContext?) => {
    // For image_gen tool, use non-streaming path
    if (toolName === 'image_gen') {
      set({ isSending: true, error: null });
      const optId = `opt-${Date.now()}`;
      set((s) => ({
        messages: [...s.messages, { id: optId, chatId: sessionId, role: 'user', content, createdAt: new Date().toISOString() }],
      }));
      try {
        const response = await api.post<{
          success: boolean;
          data: { userMessage: ChatMessage; assistantMessage: ChatMessage | null; error?: string };
        }>(`/api/chat-sessions/${sessionId}/messages`, { content, toolName, toolParams: toolParams || {} });
        if (response.success) {
          const { userMessage, assistantMessage, error } = response.data;
          set((s) => ({
            messages: [...s.messages.filter((m) => m.id !== optId), userMessage, ...(assistantMessage ? [assistantMessage] : [])],
            isSending: false,
            error: error || null,
          }));
        }
      } catch (err) {
        set((s) => ({ messages: s.messages.filter((m) => m.id !== optId), isSending: false, error: 'Failed to send message' }));
      }
      return;
    }

    // Streaming path for normal chat + webfetch
    set({ isSending: true, error: null });

    // Optimistic user message
    const optId = `opt-${Date.now()}`;
    set((s) => ({
      messages: [...s.messages, { id: optId, chatId: sessionId, role: 'user', content, createdAt: new Date().toISOString() }],
    }));

    try {
      const token = getAuthToken();
      const body: Record<string, unknown> = { content };
      if (toolContext) body.toolContext = toolContext;

      const response = await fetch(`${API_BASE_URL}/api/chat-sessions/${sessionId}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        set((s) => ({ messages: s.messages.filter((m) => m.id !== optId), isSending: false, error: 'Failed to send message' }));
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let streamMsgId = `stream-${Date.now()}`;
      let hasStreamStarted = false;
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === 'user') {
                // Replace optimistic with real user message
                set((s) => ({
                  messages: s.messages.map((m) => (m.id === optId ? event.message : m)),
                }));
              } else if (event.type === 'chunk') {
                if (!hasStreamStarted) {
                  hasStreamStarted = true;
                  set((s) => ({
                    messages: [
                      ...s.messages,
                      { id: streamMsgId, chatId: sessionId, role: 'assistant', content: '', createdAt: new Date().toISOString() },
                    ],
                  }));
                }
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === streamMsgId ? { ...m, content: m.content + event.content } : m
                  ),
                }));
              } else if (event.type === 'done') {
                if (event.message) {
                  set((s) => ({
                    messages: s.messages.map((m) => (m.id === streamMsgId ? event.message : m)),
                  }));
                }
              } else if (event.type === 'error') {
                set({ error: event.error });
              }
            } catch {}
          }
        }
      }

      set({ isSending: false });
    } catch (err) {
      console.error('[ChatSessionStore] Failed to send message:', err);
      set((s) => ({ messages: s.messages.filter((m) => m.id !== optId), isSending: false, error: 'Failed to send message' }));
    }
  },
}));
