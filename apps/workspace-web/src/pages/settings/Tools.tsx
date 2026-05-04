import { useState, useEffect } from 'react';
import { Button, Input } from '@/components/common';
import { cn } from '@/utils/cn';
import { api } from '@/services/api';
import type { ToolDefinition } from '@/types';
import { Save, Loader2, ChevronDown, ChevronRight, FileText } from 'lucide-react';

export function Tools() {
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [providers, setProviders] = useState<any[]>([]);

  useEffect(() => {
    loadTools();
    loadProviders();
  }, []);

  const loadTools = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAvailableTools();
      setTools(data);
    } catch (err) {
      console.error('Failed to load tools:', err);
      setError('Failed to load tools. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = async () => {
    try {
      const data = await api.getAIProviders();
      setProviders(data);
    } catch (err) {
      console.error('Failed to load providers:', err);
    }
  };

  const handleToggle = (toolName: string) => {
    setTools((prev) =>
      prev.map((t) =>
        t.name === toolName ? { ...t, isEnabled: !t.isEnabled } : t
      )
    );
    setDirty(true);
    setSuccess(null);
    setError(null);
  };

  const handleConfigChange = (
    toolName: string,
    key: string,
    value: string | number
  ) => {
    setTools((prev) =>
      prev.map((t) =>
        t.name === toolName
          ? { ...t, config: { ...t.config, [key]: value } }
          : t
      )
    );
    setDirty(true);
    setSuccess(null);
    setError(null);
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      await Promise.all(
        tools.map((t) =>
          api.updateToolConfig(t.name, {
            isEnabled: t.isEnabled,
            config: t.config,
          })
        )
      );
      setDirty(false);
      setSuccess('Tool settings saved successfully.');
    } catch (err) {
      console.error('Failed to save tool configs:', err);
      setError('Failed to save tool settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12 text-text-tertiary">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading tools...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Tools</h1>
          <p className="text-sm text-text-tertiary">
            Configure tools available to all agents
          </p>
        </div>
        <Button
          onClick={handleSaveAll}
          isLoading={saving}
          size="sm"
          disabled={!dirty}
          variant={dirty ? 'primary' : 'secondary'}
        >
          <Save className="h-3.5 w-3.5 mr-1.5" />
          Save Settings
        </Button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-status-error/10 border-2 border-status-error/30 rounded-[var(--radius-md)] text-sm text-status-error">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 px-4 py-3 bg-status-success/10 border-2 border-status-success/30 rounded-[var(--radius-md)] text-sm text-status-success">
          {success}
        </div>
      )}

      <div className="space-y-4">
        {tools.map((tool) => (
          <div
            key={tool.name}
            className={cn(
              'bg-bg-primary rounded-[var(--radius-lg)] border-2 border-[var(--color-border-primary)] overflow-hidden shadow-[var(--shadow-card)] transition-opacity',
              !tool.isEnabled && 'opacity-60'
            )}
          >
            {/* Tool Header */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{tool.icon || '🔧'}</span>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">
                    {tool.displayName}
                  </h3>
                  <p className="text-xs text-text-tertiary">
                    {tool.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Toggle */}
                <button
                  onClick={() => handleToggle(tool.name)}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors border-2 border-[var(--color-border-primary)]',
                    tool.isEnabled
                      ? 'bg-[var(--color-accent-primary)]'
                      : 'bg-bg-tertiary'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-[var(--shadow-sm)]',
                      tool.isEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    )}
                  />
                </button>
                <span
                  className={cn(
                    'text-xs font-semibold px-2 py-0.5 rounded-[var(--radius-sm)] border-2',
                    tool.isEnabled
                      ? 'bg-status-success/10 text-status-success border-status-success/30'
                      : 'bg-bg-tertiary text-text-tertiary border-[var(--color-border-primary)]'
                  )}
                >
                  {tool.isEnabled ? 'Active' : 'Disabled'}
                </span>
              </div>
            </div>

            {/* Config Fields (only visible when enabled) */}
            {tool.isEnabled && (
              <div className="border-t-2 border-[var(--color-border-secondary)] px-5 py-4 bg-[var(--color-bg-secondary)]">
                <p className="text-xs font-semibold text-text-tertiary uppercase mb-3">
                  Default Parameters
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tool.name === 'webfetch' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-text-primary mb-1">
                          Max chars
                        </label>
                        <Input
                          type="number"
                          value={(tool.config.maxChars as number) ?? 10000}
                          onChange={(e) =>
                            handleConfigChange(
                              tool.name,
                              'maxChars',
                              parseInt(e.target.value) || 10000
                            )
                          }
                          min={1000}
                          max={100000}
                        />
                        <p className="text-xs text-text-tertiary mt-1">
                          Max response size
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-primary mb-1">
                          Timeout (ms)
                        </label>
                        <Input
                          type="number"
                          value={(tool.config.timeout as number) ?? 15000}
                          onChange={(e) =>
                            handleConfigChange(
                              tool.name,
                              'timeout',
                              parseInt(e.target.value) || 15000
                            )
                          }
                          min={5000}
                          max={60000}
                          step={1000}
                        />
                        <p className="text-xs text-text-tertiary mt-1">
                          Request timeout
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-primary mb-1">
                          User Agent
                        </label>
                        <Input
                          type="text"
                          value={
                            (tool.config.userAgent as string) ??
                            'Worf-Tool/1.0'
                          }
                          onChange={(e) =>
                            handleConfigChange(
                              tool.name,
                              'userAgent',
                              e.target.value
                            )
                          }
                        />
                        <p className="text-xs text-text-tertiary mt-1">
                          HTTP User-Agent header
                        </p>
                      </div>
                    </>
                  )}
                  {tool.name === 'image_gen' && (
                    <div className="md:col-span-2 lg:col-span-3">
                      <label className="block text-xs font-medium text-text-primary mb-1">
                        AI Provider
                      </label>
                      <select
                        value={(tool.config.providerId as string) || ''}
                        onChange={(e) => handleConfigChange(tool.name, 'providerId', e.target.value)}
                        className="w-full px-3 py-2 h-11 text-sm rounded-[var(--radius-md)] border-2 border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] text-text-primary hover:border-text-secondary focus:border-[var(--color-accent-primary)] focus:outline-none focus:shadow-[4px_4px_0px_#0D0D0D]"
                      >
                        <option value="">Select a provider...</option>
                        {providers.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name} ({p.provider} - {p.model})</option>
                        ))}
                      </select>
                      <p className="text-xs text-text-tertiary mt-1">
                        Uses the provider's configured model for image generation
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Agent Instructions (skill) */}
            <div className="border-t-2 border-[var(--color-border-secondary)]">
              <button
                type="button"
                onClick={() => setExpandedSkill(expandedSkill === tool.name ? null : tool.name)}
                className="flex items-center gap-2 w-full px-5 py-3 text-left text-xs font-semibold text-text-tertiary uppercase hover:bg-bg-hover transition-colors-fast"
              >
                {expandedSkill === tool.name ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <FileText className="h-3 w-3" />
                Agent Instructions (skill)
              </button>
              {expandedSkill === tool.name && tool.skill && (
                <div className="px-5 pb-4">
                  <div className="bg-bg-primary border-2 border-[var(--color-border-primary)] rounded-[var(--radius-md)] p-4 max-h-64 overflow-y-auto">
                    <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap leading-relaxed">
                      {tool.skill}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {tools.length === 0 && !loading && (
        <div className="bg-bg-primary rounded-[var(--radius-lg)] border-2 border-[var(--color-border-primary)] shadow-[var(--shadow-card)] p-8 text-center text-text-tertiary">
          No tools available. Add tools to the registry to see them here.
        </div>
      )}
    </div>
  );
}
