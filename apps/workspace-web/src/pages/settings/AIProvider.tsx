import { useState, useEffect } from 'react';
import { Button, Input, Modal, Select } from '@/components/common';
import { Plus, Pencil, Trash2, TestTube } from 'lucide-react';
import { cn } from '@/utils/cn';
import { api } from '@/services/api';

interface AIProvider {
  id: string;
  name: string;
  provider: string;
  apiUrl: string;
  apiKey: string;
  model: string;
  isActive: boolean;
  isDefault: boolean;
}

const providerOptions = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'azure', label: 'Azure OpenAI' },
  { value: 'custom', label: 'Custom (OpenAI compatible)' },
];

// Default API URLs per provider
const defaultApiUrls: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  anthropic: 'https://api.anthropic.com',
  google: 'https://generativelanguage.googleapis.com/v1',
  azure: 'https://<your-resource>.openai.azure.com',
  custom: 'https://api.example.com/v1',
};

// Default models per provider
const defaultModels: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
  google: ['gemini-1.5-pro', 'gemini-1.5-flash'],
  azure: ['gpt-4', 'gpt-35-turbo'],
  custom: ['gpt-4o'],
};

interface ProviderFormData {
  name: string;
  provider: string;
  apiUrl: string;
  apiKey: string;
  model: string;
}

export function AIProvider() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [deletingProvider, setDeletingProvider] = useState<AIProvider | null>(null);
  const [testingProvider, setTestingProvider] = useState<AIProvider | null>(null);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const response = await api.getAIProviders();
      setProviders(response);
    } catch (err) {
      console.error('Failed to load providers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingProvider(null);
    setIsModalOpen(true);
  };

  const handleEdit = (provider: AIProvider) => {
    setEditingProvider(provider);
    setIsModalOpen(true);
  };

  const handleDelete = (provider: AIProvider) => {
    setDeletingProvider(provider);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (deletingProvider) {
      try {
        await api.deleteAIProvider(deletingProvider.id);
        setProviders(providers.filter((p) => p.id !== deletingProvider.id));
      } catch (err) {
        console.error('Failed to delete provider:', err);
      }
      setIsDeleteModalOpen(false);
      setDeletingProvider(null);
    }
  };

  const handleToggleActive = async (provider: AIProvider) => {
    try {
      const updated = await api.updateAIProvider(provider.id, { isActive: !provider.isActive });
      if (updated.success) {
        setProviders(providers.map((p) => (p.id === provider.id ? { ...p, isActive: !p.isActive } : p)));
      }
    } catch (err) {
      console.error('Failed to toggle provider:', err);
    }
  };

  const handleTest = async (provider: AIProvider) => {
    setTestingProvider(provider);
    setIsTestModalOpen(true);
    setTestResult(null);
    setIsTesting(true);

    try {
      // Try a simple API call to test
      const response = await fetch(`${provider.apiUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        setTestResult({ type: 'success', text: `Connection successful to ${provider.name}!` });
      } else {
        setTestResult({ type: 'error', text: `Error: ${response.status} ${response.statusText}` });
      }
    } catch (err: any) {
      setTestResult({ type: 'error', text: `Connection failed: ${err.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (data: ProviderFormData) => {
    try {
      if (editingProvider) {
        await api.updateAIProvider(editingProvider.id, data);
      } else {
        await api.createAIProvider(data);
      }
      await loadProviders();
      setIsModalOpen(false);
      setEditingProvider(null);
    } catch (err) {
      console.error('Failed to save provider:', err);
    }
  };

  const getProviderLabel = (value: string) => {
    return providerOptions.find((p) => p.value === value)?.label || value;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">AI Providers</h1>
          <p className="text-sm text-text-tertiary">Manage AI provider configurations</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Provider
        </Button>
      </div>

      <div className="bg-bg-primary rounded-[var(--radius-lg)] border-2 border-[var(--color-border-primary)] overflow-hidden shadow-[var(--shadow-card)]">
        <table className="w-full">
          <thead className="bg-bg-tertiary border-b-2 border-[var(--color-border-primary)]">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase">Provider</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase">API URL</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase">Model</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-tertiary uppercase">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-tertiary uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {providers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-tertiary">
                  No providers configured. Add your first provider.
                </td>
              </tr>
            ) : (
              providers.map((provider) => (
                <tr key={provider.id} className="border-b border-[var(--color-border-secondary)] last:border-0">
                  <td className="px-4 py-3 text-sm font-medium text-text-primary">{provider.name}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{getProviderLabel(provider.provider)}</td>
                  <td className="px-4 py-3 text-sm text-text-tertiary font-mono text-xs">{provider.apiUrl}</td>
                  <td className="px-4 py-3 text-sm text-text-tertiary">{provider.model}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(provider)}
                      className={cn(
                        'px-2 py-1 text-xs rounded-[var(--radius-sm)] border-2 transition-colors-fast font-semibold',
                        provider.isActive ? 'bg-status-success/10 text-status-success border-status-success/30' : 'bg-bg-tertiary text-text-tertiary border-[var(--color-border-primary)]'
                      )}
                    >
                      {provider.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleTest(provider)}
                        className="p-1.5 rounded hover:bg-bg-hover transition-colors-fast"
                        title="Test Connection"
                      >
                        <TestTube className="h-4 w-4 text-text-tertiary" />
                      </button>
                      <button
                        onClick={() => handleEdit(provider)}
                        className="p-1.5 rounded hover:bg-bg-hover transition-colors-fast"
                      >
                        <Pencil className="h-4 w-4 text-text-tertiary" />
                      </button>
                      <button
                        onClick={() => handleDelete(provider)}
                        className="p-1.5 rounded hover:bg-bg-hover transition-colors-fast"
                      >
                        <Trash2 className="h-4 w-4 text-status-error" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ProviderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} provider={editingProvider} />

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Provider">
        <p className="text-text-secondary mb-4">
          Delete provider <span className="font-medium text-text-primary">{deletingProvider?.name}</span>? This cannot be undone.
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

      <Modal isOpen={isTestModalOpen} onClose={() => setIsTestModalOpen(false)} title="Test Connection">
        <div className="space-y-4">
          <p className="text-text-secondary">
            Testing connection to <span className="font-medium text-text-primary">{testingProvider?.name}</span>
          </p>
          {testResult && (
            <div className={`p-3 rounded-[var(--radius-md)] text-sm border-2 shadow-[var(--shadow-sm)] ${testResult.type === 'success' ? 'bg-status-success/10 text-status-success border-status-success/30' : 'bg-status-error/10 text-status-error border-status-error/30'}`}>
              {testResult.text}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsTestModalOpen(false)}>
              Close
            </Button>
            <Button onClick={() => testingProvider && handleTest(testingProvider)} isLoading={isTesting}>
              Retry
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ProviderModal({
  isOpen,
  onClose,
  onSave,
  provider,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProviderFormData) => void;
  provider: AIProvider | null;
}) {
  const [formData, setFormData] = useState<ProviderFormData>({
    name: provider?.name || '',
    provider: provider?.provider || 'openai',
    apiUrl: provider?.apiUrl || 'https://api.openai.com/v1',
    apiKey: '',
    model: provider?.model || 'gpt-4',
  });

  // Update form when provider changes
  useEffect(() => {
    setFormData({
      name: provider?.name || '',
      provider: provider?.provider || 'openai',
      apiUrl: provider?.apiUrl || 'https://api.openai.com/v1',
      apiKey: '',
      model: provider?.model || 'gpt-4',
    });
  }, [provider]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const getDefaultApiUrl = (providerValue: string) => {
    switch (providerValue) {
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
        return 'https://api.anthropic.com';
      case 'google':
        return 'https://generativelanguage.googleapis.com/v1';
      case 'azure':
        return 'https://your-resource.openai.azure.com';
      default:
        return '';
    }
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFormData({
      ...formData,
      provider: value,
      apiUrl: getDefaultApiUrl(value),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={provider ? 'Edit Provider' : 'Add Provider'} className="max-w-2xl">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Name</label>
          <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="OpenAI Main" />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Provider</label>
          <Select
            value={formData.provider}
            onChange={handleProviderChange}
            options={providerOptions}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">API URL</label>
          <Input value={formData.apiUrl} onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })} placeholder="https://api.openai.com/v1" />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">API Key {provider && <span className="text-text-tertiary font-normal">(leave empty to keep current)</span>}</label>
          <Input type="password" value={formData.apiKey} onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })} placeholder={provider ? '••••••••' : 'Enter API key'} />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Model</label>
          <Input value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} placeholder="gpt-4" />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}