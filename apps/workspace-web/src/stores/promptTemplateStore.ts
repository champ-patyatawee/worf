import { create } from 'zustand';
import { api } from '@/services/api';

export interface PromptTemplate {
  id: string;
  userId: string;
  name: string;
  content: string;
  description?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PromptTemplateState {
  templates: PromptTemplate[];
  isLoading: boolean;
  error: string | null;

  fetchTemplates: () => Promise<void>;
  createTemplate: (data: { name: string; content: string; description?: string; isDefault?: boolean }) => Promise<void>;
  updateTemplate: (id: string, data: { name?: string; content?: string; description?: string; isDefault?: boolean }) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
}

export const usePromptTemplateStore = create<PromptTemplateState>((set, get) => ({
  templates: [],
  isLoading: false,
  error: null,

  fetchTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<{ success: boolean; data: PromptTemplate[] }>('/api/prompt-templates');
      if (response.success) {
        set({ templates: response.data, isLoading: false });
      } else {
        set({ error: 'Failed to fetch templates', isLoading: false });
      }
    } catch (err) {
      console.error('[PromptTemplateStore] Failed to fetch templates:', err);
      set({ error: 'Failed to fetch templates', isLoading: false });
    }
  },

  createTemplate: async (data) => {
    try {
      const response = await api.post<{ success: boolean; data: PromptTemplate }>('/api/prompt-templates', data);
      if (response.success) {
        set((state) => ({ templates: [...state.templates, response.data] }));
      }
    } catch (err) {
      console.error('[PromptTemplateStore] Failed to create template:', err);
      throw err;
    }
  },

  updateTemplate: async (id, data) => {
    try {
      const response = await api.put<{ success: boolean; data: PromptTemplate }>(`/api/prompt-templates/${id}`, data);
      if (response.success) {
        set((state) => ({
          templates: state.templates.map((t) => (t.id === id ? response.data : t)),
        }));
      }
    } catch (err) {
      console.error('[PromptTemplateStore] Failed to update template:', err);
      throw err;
    }
  },

  deleteTemplate: async (id) => {
    try {
      await api.delete(`/api/prompt-templates/${id}`);
      set((state) => ({ templates: state.templates.filter((t) => t.id !== id) }));
    } catch (err) {
      console.error('[PromptTemplateStore] Failed to delete template:', err);
      throw err;
    }
  },
}));
