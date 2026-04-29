import { useState, useEffect } from 'react';
import { Button } from '@/components/common';
import { Package, Plus, Check, Loader2, Trash2 } from 'lucide-react';
import { api } from '@/services/api';

interface Plugin {
  id: string;
  name: string;
  displayName: string;
  description: string;
  version: string;
  isInstalled: boolean;
}

const availablePlugins: Plugin[] = [
  {
    id: 'kanban',
    name: 'kanban',
    displayName: 'Kanban Agent',
    description: 'Project management with Kanban boards, tasks, and workflow. Create todos, track progress from To Do → Doing → Done.',
    version: '1.0.0',
    isInstalled: false,
  },
];

export function Plugins() {
  const [plugins, setPlugins] = useState<Plugin[]>(availablePlugins);
  const [installing, setInstalling] = useState<string | null>(null);

  // Fetch plugin status on mount
  useEffect(() => {
    const fetchPluginStatus = async () => {
      try {
        const statusPromises = availablePlugins.map(async (plugin) => {
          try {
            const response = await api.get(`/api/plugins/${plugin.id}/status`);
            return { ...plugin, isInstalled: response.data.installed };
          } catch {
            return plugin;
          }
        });
        const updatedPlugins = await Promise.all(statusPromises);
        setPlugins(updatedPlugins);
      } catch (err) {
        console.error('Failed to fetch plugin status:', err);
      }
    };

    fetchPluginStatus();
  }, []);

const handleInstall = async (plugin: Plugin) => {
    setInstalling(plugin.id);
    
    try {
      await api.post('/api/plugins/install', { pluginId: plugin.id });

      setPlugins(plugins.map(p => 
        p.id === plugin.id ? { ...p, isInstalled: true } : p
      ));
    } catch (err) {
      console.error('Failed to install plugin:', err);
    } finally {
      setInstalling(null);
    }
  };

  const handleUninstall = async (plugin: Plugin) => {
    if (!confirm(`Are you sure you want to uninstall ${plugin.displayName}?`)) {
      return;
    }

    setInstalling(plugin.id);
    
    try {
      await api.post(`/api/plugins/${plugin.id}/uninstall`);

      setPlugins(plugins.map(p => 
        p.id === plugin.id ? { ...p, isInstalled: false } : p
      ));
    } catch (err) {
      console.error('Failed to uninstall plugin:', err);
    } finally {
      setInstalling(null);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Plugins</h1>
          <p className="text-sm text-text-tertiary">Install and manage plugins for your workspace</p>
        </div>
      </div>

      <div className="grid gap-4">
        {plugins.map((plugin) => (
          <div key={plugin.id} className="bg-bg-primary rounded-[var(--radius-lg)] border-2 border-[var(--color-border-primary)] shadow-[var(--shadow-card)] p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-accent-subtle)] border-2 border-[var(--color-border-primary)] flex items-center justify-center">
                  <Package className="h-5 w-5 text-[var(--color-accent-primary)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-text-primary">{plugin.displayName}</h3>
                    <span className="text-xs text-text-tertiary">v{plugin.version}</span>
                  </div>
                  <p className="text-sm text-text-secondary mt-1">{plugin.description}</p>
                  
                  <div className="flex items-center gap-4 mt-3 text-xs text-text-tertiary">
                    <span>Web: http://localhost:4001</span>
                    <span>API: http://localhost:3002</span>
                  </div>
                </div>
              </div>

              <div>
                {plugin.isInstalled ? (
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUninstall(plugin)}
                      disabled={installing === plugin.id}
                      className="text-status-error hover:text-status-error"
                    >
                      {installing === plugin.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Uninstall
                    </Button>
                    <Button disabled>
                      <Check className="h-4 w-4 mr-2" />
                      Installed
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={() => handleInstall(plugin)}
                    disabled={installing === plugin.id}
                  >
                    {installing === plugin.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Install
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {plugins.every(p => p.isInstalled) && (
        <div className="mt-6 p-4 bg-status-success/10 border-2 border-status-success/30 rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)]">
          <p className="text-sm text-status-success font-semibold">All plugins installed. You're ready to go!</p>
        </div>
      )}
    </div>
  );
}