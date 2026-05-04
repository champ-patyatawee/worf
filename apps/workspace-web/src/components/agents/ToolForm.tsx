// src/components/agents/ToolForm.tsx
import { useState, useCallback, FormEvent } from 'react';
import { Button } from '@/components/common';
import { cn } from '@/utils/cn';
import { Loader2, X, Globe, Wrench } from 'lucide-react';
import type { ToolDefinition } from '@/types';
import { toolIconMap } from './ToolBar';

interface ToolFormProps {
  tool: ToolDefinition;
  config: Record<string, unknown>;
  onExecute: (params: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  isExecuting: boolean;
}

export function ToolForm({ tool, config, onExecute, onCancel, isExecuting }: ToolFormProps) {
  const [params, setParams] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (tool.inputSchema?.properties) {
      for (const [key, prop] of Object.entries(tool.inputSchema.properties)) {
        initial[key] = String(prop.default ?? config[key] ?? '');
      }
    }
    return initial;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleParamChange = useCallback((key: string, value: string) => {
    setParams((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (tool.inputSchema?.required) {
      for (const key of tool.inputSchema.required) {
        if (!params[key]?.trim()) {
          const prop = tool.inputSchema.properties[key];
          newErrors[key] = `${prop?.description || key} is required`;
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [tool.inputSchema, params]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      // Parse number fields
      const parsed: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(params)) {
        const prop = tool.inputSchema?.properties[key];
        if (prop?.type === 'number') {
          parsed[key] = Number(value);
        } else {
          parsed[key] = value;
        }
      }

      onExecute(parsed);
    },
    [params, tool.inputSchema, validate, onExecute]
  );

  if (!tool.inputSchema?.properties) return null;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[var(--color-bg-secondary)] border-2 border-[var(--color-border-primary)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[var(--color-accent-primary)]">{toolIconMap[tool.name] || <Wrench className="h-5 w-5" />}</span>
          <span className="text-sm font-bold text-text-primary">{tool.displayName}</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded hover:bg-bg-hover transition-colors-fast text-text-tertiary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Form fields */}
      <div className="space-y-3">
        {Object.entries(tool.inputSchema.properties).map(([key, prop]) => (
          <div key={key}>
            <label className="block text-xs font-medium text-text-primary mb-1">
              {prop.description || key}
              {tool.inputSchema?.required?.includes(key) && (
                <span className="text-status-error ml-0.5">*</span>
              )}
            </label>
            {prop.enum ? (
              <select
                value={params[key] || ''}
                onChange={(e) => handleParamChange(key, e.target.value)}
                className={cn(
                  'w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border-2 bg-[var(--color-bg-primary)] text-text-primary',
                  errors[key]
                    ? 'border-status-error'
                    : 'border-[var(--color-border-primary)] hover:border-text-secondary focus:border-[var(--color-accent-primary)]',
                  'focus:outline-none focus:shadow-[4px_4px_0px_#0D0D0D]'
                )}
              >
                {prop.enum.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : prop.type === 'number' ? (
              <input
                type="number"
                value={params[key] || ''}
                onChange={(e) => handleParamChange(key, e.target.value)}
                placeholder={prop.description}
                className={cn(
                  'w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border-2 bg-[var(--color-bg-primary)] text-text-primary',
                  errors[key]
                    ? 'border-status-error'
                    : 'border-[var(--color-border-primary)] hover:border-text-secondary focus:border-[var(--color-accent-primary)]',
                  'focus:outline-none focus:shadow-[4px_4px_0px_#0D0D0D]'
                )}
              />
            ) : (
              <input
                type="text"
                value={params[key] || ''}
                onChange={(e) => handleParamChange(key, e.target.value)}
                placeholder={prop.description}
                className={cn(
                  'w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border-2 bg-[var(--color-bg-primary)] text-text-primary',
                  errors[key]
                    ? 'border-status-error'
                    : 'border-[var(--color-border-primary)] hover:border-text-secondary focus:border-[var(--color-accent-primary)]',
                  'focus:outline-none focus:shadow-[4px_4px_0px_#0D0D0D]'
                )}
              />
            )}
            {errors[key] && (
              <p className="text-xs text-status-error mt-0.5">{errors[key]}</p>
            )}
          </div>
        ))}
      </div>

      {/* Info + actions */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t-2 border-[var(--color-border-secondary)]">
        <p className="text-xs text-text-tertiary">
          Configurable in Settings &gt; Tools
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isExecuting}>
            {isExecuting ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Running...
              </>
            ) : tool.name === 'webfetch' ? (
              <>
                <Globe className="h-3.5 w-3.5 mr-1" />
                Fetch
              </>
            ) : (
              'Execute'
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
