import { useState, useEffect } from 'react';
import { Button, Input, Modal, Select } from '@/components/common';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { api } from '@/services/api';

interface AIProvider {
  id: string;
  name: string;
  provider: string;
  model: string;
  isActive: boolean;
}

interface Agent {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  systemPrompt: string;
  avatar?: string;
  isActive: boolean;
  providerId?: string;
  agentUrl?: string;
  agentType?: string;
  slashCommand?: string;
  webViewUrl?: string;
  createdAt?: string;
}

interface AgentFormData {
  name: string;
  displayName: string;
  description: string;
  systemPrompt: string;
  providerId: string;
  agentUrl: string;
  agentType: string;
  slashCommand: string;
  webViewUrl: string;
}

export function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<Agent | null>(null);

  useEffect(() => {
    loadAgents();
    loadProviders();
  }, []);

  const loadAgents = async () => {
    try {
      const response = await api.get<{ success: boolean; data: Agent[] }>('/api/agents');
      if (response.success) {
        setAgents(response.data);
      }
    } catch (err) {
      console.error('Failed to load agents:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = async () => {
    try {
      const response = await api.getAIProviders();
      setProviders(response.filter((p: AIProvider) => p.isActive));
    } catch (err) {
      console.error('Failed to load providers:', err);
    }
  };

  const handleAdd = () => {
    setEditingAgent(null);
    setIsModalOpen(true);
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setIsModalOpen(true);
  };

  const handleDelete = (agent: Agent) => {
    setDeletingAgent(agent);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (deletingAgent) {
      try {
        await api.delete(`/api/agents/${deletingAgent.id}`);
        setAgents(agents.filter((a) => a.id !== deletingAgent.id));
      } catch (err) {
        console.error('Failed to delete agent:', err);
      }
      setIsDeleteModalOpen(false);
      setDeletingAgent(null);
    }
  };

  const handleToggleActive = async (agent: Agent) => {
    try {
      await api.put(`/api/agents/${agent.id}`, { isActive: !agent.isActive });
      setAgents(agents.map((a) => (a.id === agent.id ? { ...a, isActive: !a.isActive } : a)));
    } catch (err) {
      console.error('Failed to toggle agent:', err);
    }
  };

  const handleSave = async (data: AgentFormData) => {
    try {
      const payload: Record<string, unknown> = {
        displayName: data.displayName,
        description: data.description,
        systemPrompt: data.systemPrompt,
        providerId: data.providerId || null,
        agentUrl: data.agentUrl || null,
        agentType: data.agentType || null,
        slashCommand: data.slashCommand || null,
        webViewUrl: data.webViewUrl || null,
      };

      if (editingAgent) {
        await api.put(`/api/agents/${editingAgent.id}`, payload);
      } else {
        await api.post('/api/agents', { name: data.name, ...payload });
      }
      await loadAgents();
      setIsModalOpen(false);
      setEditingAgent(null);
    } catch (err) {
      console.error('Failed to save agent:', err);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Agents</h1>
          <p className="text-sm text-text-tertiary">Manage AI agents for your workspace</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Agent
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-text-tertiary">Loading agents...</div>
      ) : agents.length === 0 ? (
        <div className="bg-bg-primary rounded-[var(--radius-lg)] border-2 border-[var(--color-border-primary)] shadow-[var(--shadow-card)] p-8 text-center text-text-tertiary">
          No agents configured. Add your first agent.
        </div>
      ) : (
        <div className="bg-bg-primary rounded-[var(--radius-lg)] border-2 border-[var(--color-border-primary)] overflow-hidden shadow-[var(--shadow-card)]">
          <table className="w-full">
            <thead className="bg-bg-tertiary border-b-2 border-[var(--color-border-primary)]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase">Provider</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase">Actions</th>
              </tr>
            </thead>
              <tbody>
              {agents.map((agent) => {
                const provider = providers.find((p) => p.id === agent.providerId);
                return (
                <tr key={agent.id} className="border-b border-[var(--color-border-secondary)] last:border-0">
                  <td className="px-4 py-3 text-sm font-medium text-text-primary">{agent.name}</td>
                  <td className="px-4 py-3 text-sm text-text-tertiary">{agent.description || '-'}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{provider ? provider.name : '-'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(agent)}
                      className={cn(
                        'px-2 py-1 text-xs rounded-[var(--radius-sm)] border-2 transition-colors-fast font-semibold',
                        agent.isActive
                          ? 'bg-status-success/10 text-status-success border-status-success/30'
                          : 'bg-bg-tertiary text-text-tertiary border-[var(--color-border-primary)]'
                      )}
                    >
                      {agent.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(agent)}
                        className="p-1.5 rounded hover:bg-bg-hover transition-colors-fast"
                      >
                        <Pencil className="h-4 w-4 text-text-tertiary" />
                      </button>
                      <button
                        onClick={() => handleDelete(agent)}
                        className="p-1.5 rounded hover:bg-bg-hover transition-colors-fast"
                      >
                        <Trash2 className="h-4 w-4 text-status-error" />
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}

      <AgentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        agent={editingAgent}
        providers={providers}
      />

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Agent">
        <p className="text-text-secondary mb-4">
          Delete agent <span className="font-medium text-text-primary">{deletingAgent?.name}</span>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function AgentModal({
  isOpen,
  onClose,
  onSave,
  agent,
  providers,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AgentFormData) => void;
  agent: Agent | null;
  providers: AIProvider[];
}) {
  const [formData, setFormData] = useState<AgentFormData>({
    name: agent?.name || '',
    displayName: agent?.displayName || '',
    description: agent?.description || '',
    systemPrompt: agent?.systemPrompt || '',
    providerId: agent?.providerId || '',
    agentUrl: agent?.agentUrl || '',
    agentType: agent?.agentType || 'embedded',
    slashCommand: agent?.slashCommand || '',
    webViewUrl: agent?.webViewUrl || '',
  });

  const [activeTab, setActiveTab] = useState<'config' | 'prompt'>('config');

  // Update form when agent changes
  useEffect(() => {
    setFormData({
      name: agent?.name || '',
      displayName: agent?.displayName || '',
      description: agent?.description || '',
      systemPrompt: agent?.systemPrompt || '',
      providerId: agent?.providerId || '',
      agentUrl: agent?.agentUrl || '',
      agentType: agent?.agentType || 'embedded',
      slashCommand: agent?.slashCommand || '',
      webViewUrl: agent?.webViewUrl || '',
    });
  }, [agent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={agent ? 'Edit Agent' : 'Add Agent'} className="max-w-2xl">
      <div>
      {!agent && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-primary mb-1">Name (use @ prefix)</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="@AgentKanban"
          />
        </div>
      )}
      
      {/* Tabs */}
      <div className="flex border-b-2 border-[var(--color-border-primary)] mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('config')}
          className={cn(
            'px-4 py-2 text-sm font-extrabold border-b-2 -mb-px transition-colors-fast',
            activeTab === 'config'
              ? 'border-[var(--color-accent-primary)] text-[var(--color-accent-primary)] bg-[var(--color-accent-subtle)]'
              : 'border-transparent text-text-tertiary hover:text-text-primary hover:bg-bg-hover'
          )}
        >
          Config
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('prompt')}
          className={cn(
            'px-4 py-2 text-sm font-extrabold border-b-2 -mb-px transition-colors-fast',
            activeTab === 'prompt'
              ? 'border-[var(--color-accent-primary)] text-[var(--color-accent-primary)] bg-[var(--color-accent-subtle)]'
              : 'border-transparent text-text-tertiary hover:text-text-primary hover:bg-bg-hover'
          )}
        >
          System Prompt
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5">
        {activeTab === 'config' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Display Name</label>
              <Input
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="Kanban Assistant"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Helps manage Kanban boards"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">AI Provider</label>
              <p className="text-xs text-text-tertiary mb-2">
                Select which AI provider to use for this agent. Leave empty to use default.
              </p>
              <Select
                value={formData.providerId}
                onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
                options={[
                  { value: '', label: 'Default (first active provider)' },
                  ...providers.map((p) => ({ value: p.id, label: `${p.name} (${p.provider})` })),
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Agent Type</label>
              <p className="text-xs text-text-tertiary mb-2">
                Embedded uses LLM directly. External proxies to a microservice.
              </p>
              <Select
                value={formData.agentType}
                onChange={(e) => setFormData({ ...formData, agentType: e.target.value })}
                options={[
                  { value: 'embedded', label: 'Embedded' },
                  { value: 'external', label: 'External' },
                ]}
              />
            </div>
            {formData.agentType === 'external' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Agent URL</label>
                  <p className="text-xs text-text-tertiary mb-2">
                    URL of the external agent microservice (e.g., http://agent-kanban:8000)
                  </p>
                  <Input
                    value={formData.agentUrl}
                    onChange={(e) => setFormData({ ...formData, agentUrl: e.target.value })}
                    placeholder="http://agent-kanban:8000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Slash Command</label>
                  <p className="text-xs text-text-tertiary mb-2">
                    Type this command in chat to open the agent web view (e.g., /kanban)
                  </p>
                  <Input
                    value={formData.slashCommand}
                    onChange={(e) => setFormData({ ...formData, slashCommand: e.target.value })}
                    placeholder="/kanban"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Web View URL</label>
                  <p className="text-xs text-text-tertiary mb-2">
                    URL opened when slash command is used (e.g., http://agent-kanban:8000/view)
                  </p>
                  <Input
                    value={formData.webViewUrl}
                    onChange={(e) => setFormData({ ...formData, webViewUrl: e.target.value })}
                    placeholder="http://agent-kanban:8000/view"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'prompt' && (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">System Prompt (agent.md)</label>
            <p className="text-xs text-text-tertiary mb-2">
              This defines how the agent behaves. Include personality, instructions, and constraints.
            </p>
            <textarea
              value={formData.systemPrompt}
              onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
              className="w-full h-48 px-3 py-2 bg-[var(--color-bg-secondary)] border-2 border-[var(--color-border-primary)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] text-sm font-mono resize-none focus:outline-none focus:shadow-[4px_4px_0px_#0D0D0D] focus:border-[var(--color-accent-primary)]"
              placeholder={`You are AgentKanban, a helpful assistant for managing Kanban boards.\n\nWhen a user asks to create a task:\n1. Ask for the task title\n2. Create the card\n3. Confirm to the user`}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 mt-4 border-t-2 border-[var(--color-border-primary)]">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
      </div>
    </Modal>
  );
}