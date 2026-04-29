import { useState, useEffect } from 'react';
import { Button, Select } from '@/components/common';
import { api } from '@/services/api';
import { noteApi } from '@/services/noteApi';

interface AIProvider {
  id: string;
  name: string;
  provider: string;
  model: string;
  isActive: boolean;
}

export function Note() {
  const [workspaceProviders, setWorkspaceProviders] = useState<AIProvider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [currentNoteProvider, setCurrentNoteProvider] = useState<AIProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [providers, noteProvider] = await Promise.all([
        api.getAIProviders(),
        noteApi.getNoteAiProvider(),
      ]);
      setWorkspaceProviders(providers);
      setCurrentNoteProvider(noteProvider);
      if (noteProvider) {
        const match = providers.find(
          (p: AIProvider) => p.name === noteProvider.name
        );
        if (match) setSelectedProviderId(match.id);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedProviderId) {
      setMessage({ type: 'error', text: 'Please select a provider' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await noteApi.selectNoteAiProvider(selectedProviderId);
      setMessage({ type: 'success', text: 'Note AI provider updated!' });
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-text-tertiary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Note AI Provider</h1>
        <p className="text-sm text-text-tertiary mt-1">
          Select which AI provider the Note editor should use for AI features
          (completion, generation, editing).
        </p>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-[var(--radius-md)] text-sm border-2 ${
            message.type === 'success'
              ? 'bg-status-success/10 text-status-success border-status-success/30'
              : 'bg-status-error/10 text-status-error border-status-error/30'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-bg-primary rounded-[var(--radius-lg)] border-2 border-[var(--color-border-primary)] shadow-[var(--shadow-card)] p-6 max-w-xl">
        {currentNoteProvider && (
          <div className="mb-6 p-3 bg-bg-tertiary rounded-[var(--radius-md)] border-2 border-[var(--color-border-primary)]">
            <p className="text-xs font-semibold text-text-tertiary uppercase mb-1">Currently Active</p>
            <p className="text-sm font-medium text-text-primary">
              {currentNoteProvider.name}
              <span className="text-text-tertiary ml-2">({currentNoteProvider.model})</span>
            </p>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-text-primary mb-1">
            Provider
          </label>
          <p className="text-xs text-text-tertiary mb-2">
            Choose a workspace AI provider for Note to use.
          </p>
          <Select
            value={selectedProviderId}
            onChange={(e) => {
              setSelectedProviderId(e.target.value);
              setMessage(null);
            }}
            options={[
              { value: '', label: '-- Select a provider --' },
              ...workspaceProviders.map((p) => ({
                value: p.id,
                label: `${p.name} (${p.provider} - ${p.model})`,
              })),
            ]}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t-2 border-[var(--color-border-primary)]">
          <Button
            variant="secondary"
            onClick={() => {
              setSelectedProviderId('');
              setMessage(null);
            }}
          >
            Clear
          </Button>
          <Button
            onClick={handleSave}
            isLoading={saving}
            disabled={!selectedProviderId}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
