import { create } from 'zustand';
import { api } from '@/services/api';

export interface Agent {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  systemPrompt: string;
  skills: string;
  avatar?: string;
  isActive: boolean;
  providerId?: string;
  agentUrl?: string;
  agentType?: string;
  slashCommand?: string;
  webViewUrl?: string;
}

interface AgentState {
  agents: Agent[];
  isLoading: boolean;
  error: string | null;
  fetchAgents: () => Promise<void>;
  getBySlashCommand: (cmd: string) => Agent | undefined;
  getByName: (name: string) => Agent | undefined;
  getActiveSlashCommands: () => Agent[];
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  isLoading: false,
  error: null,

  fetchAgents: async () => {
    if (get().isLoading) return;
    
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<{ success: boolean; data: Agent[] }>('/api/agents');
      if (response.success) {
        set({ agents: response.data, isLoading: false });
      } else {
        set({ error: 'Failed to fetch agents', isLoading: false });
      }
    } catch (err) {
      console.error('[AgentStore] Failed to fetch agents:', err);
      set({ error: 'Failed to fetch agents', isLoading: false });
    }
  },

  getBySlashCommand: (cmd: string) => {
    const normalized = cmd.toLowerCase().replace(/^\//, '');
    return get().agents.find(
      (a) => a.slashCommand?.toLowerCase().replace(/^\//, '') === normalized
    );
  },

  getByName: (name: string) => {
    return get().agents.find(
      (a) => a.name.toLowerCase() === name.toLowerCase()
    );
  },

  getActiveSlashCommands: () => {
    return get().agents.filter(
      (a) => a.isActive && a.slashCommand && a.webViewUrl
    );
  },
}));
