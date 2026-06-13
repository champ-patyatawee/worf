import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { Select } from "../../components/ui/select";

interface AIProvider {
  id: string;
  name: string;
  provider: string;
  api_url: string;
  api_key: string;
  model: string;
  is_active: boolean;
  is_default: boolean;
}

const providerOptions = [
  { value: "openai", label: "OpenAI" },
  { value: "claude", label: "Claude (Anthropic)" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "ollama", label: "Ollama (Local)" },
  { value: "custom", label: "Custom (OpenAI compatible)" },
];

const defaultApiUrls: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  claude: "https://api.anthropic.com",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  ollama: "http://localhost:11434/v1",
  custom: "",
};

const defaultModels: Record<string, string> = {
  openai: "gpt-4o",
  claude: "claude-3-5-sonnet-20241022",
  openrouter: "",
  ollama: "llama3",
  custom: "",
};

const providerColors: Record<string, string> = {
  openai: "#10a37f",
  claude: "#d97706",
  openrouter: "#7c3aed",
  ollama: "#0891b2",
  custom: "#6b6b6b",
};

interface ProviderFormData {
  name: string;
  provider: string;
  api_url: string;
  api_key: string;
  model: string;
  is_default: boolean;
}

export function AIProvider() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AIProvider | null>(null);

  const loadProviders = async () => {
    try {
      const data = await invoke<AIProvider[]>("list_providers");
      setProviders(data);
    } catch (err) {
      console.error("Failed to load providers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this provider?")) return;
    try {
      await invoke("delete_provider", { id });
      loadProviders();
    } catch (err) {
      console.error("Failed to delete provider:", err);
    }
  };

  const handleToggle = async (provider: AIProvider) => {
    try {
      await invoke("update_provider", {
        id: provider.id,
        input: { is_active: !provider.is_active },
      });
      loadProviders();
    } catch (err) {
      console.error("Failed to toggle provider:", err);
    }
  };

  const handleSave = async (data: ProviderFormData) => {
    try {
      if (editing) {
        await invoke("update_provider", {
          id: editing.id,
          input: {
            name: data.name,
            provider: data.provider,
            api_url: data.api_url,
            api_key: data.api_key || editing.api_key,
            model: data.model,
            is_default: data.is_default,
          },
        });
      } else {
        await invoke("create_provider", { input: data });
      }
      setShowModal(false);
      setEditing(null);
      loadProviders();
    } catch (err) {
      console.error("Failed to save provider:", err);
    }
  };

  const getProviderLabel = (value: string) =>
    providerOptions.find((p) => p.value === value)?.label || value;

  const getProviderColor = (value: string) =>
    providerColors[value] || "#6b6b6b";

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[200px]">
        <div className="w-6 h-6 border-2 rounded-full animate-spin"
          style={{ borderColor: "var(--color-border-primary)", borderTopColor: "var(--color-accent-primary)" }} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>AI Providers</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-tertiary)" }}>Manage AI provider configurations for chat and notes</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }}
          className="btn-brutal flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-[var(--radius-md)] border-2"
          style={{ backgroundColor: "var(--color-accent-primary)", color: "#FFFFFF", borderColor: "var(--color-border-primary)", boxShadow: "var(--shadow-sm)" }}>
          <Plus className="w-4 h-4" /> Add Provider
        </button>
      </div>

      <div className="rounded-[var(--radius-lg)] border-2 overflow-hidden"
        style={{ backgroundColor: "var(--color-bg-primary)", borderColor: "var(--color-border-primary)", boxShadow: "var(--shadow-card)" }}>
        <table className="w-full">
          <thead>
            <tr className="border-b-2 text-left" style={{ backgroundColor: "var(--color-bg-tertiary)", borderColor: "var(--color-border-primary)" }}>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>Name</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>Provider</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>API URL</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>Model</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>Status</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: "var(--color-text-tertiary)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {providers.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: "var(--color-text-tertiary)" }}>No providers configured. Add your first provider.</td></tr>
            ) : (
              providers.map((provider) => (
                <tr key={provider.id} className="border-b last:border-b-0" style={{ borderColor: "var(--color-border-secondary)" }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getProviderColor(provider.provider) }} />
                      <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{provider.name}</span>
                      {provider.is_default && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[var(--radius-sm)] border"
                          style={{ backgroundColor: "var(--color-accent-subtle)", color: "var(--color-accent-primary)", borderColor: "var(--color-accent-primary)" }}>DEFAULT</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>{getProviderLabel(provider.provider)}</td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: "var(--color-text-tertiary)" }}>{provider.api_url}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-tertiary)" }}>{provider.model}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggle(provider)}
                      className="text-[10px] font-semibold px-2 py-1 rounded-[var(--radius-sm)] border-2 transition-colors-fast"
                      style={{ backgroundColor: provider.is_active ? "rgba(74, 222, 128, 0.1)" : "var(--color-bg-tertiary)", color: provider.is_active ? "var(--color-success)" : "var(--color-text-tertiary)", borderColor: provider.is_active ? "rgba(74, 222, 128, 0.3)" : "var(--color-border-primary)" }}>
                      {provider.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditing(provider); setShowModal(true); }}
                        className="btn-brutal w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] border-2"
                        style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border-primary)", boxShadow: "var(--shadow-sm)" }}>
                        <Pencil className="w-3.5 h-3.5" style={{ color: "var(--color-text-tertiary)" }} />
                      </button>
                      <button onClick={() => handleDelete(provider.id)}
                        className="btn-brutal w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] border-2"
                        style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border-primary)", boxShadow: "var(--shadow-sm)", color: "var(--color-error)" }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <ProviderModal
          provider={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function ProviderModal({
  provider,
  onClose,
  onSave,
}: {
  provider: AIProvider | null;
  onClose: () => void;
  onSave: (data: ProviderFormData) => void;
}) {
  const [form, setForm] = useState<ProviderFormData>({
    name: provider?.name || "",
    provider: provider?.provider || "openai",
    api_url: provider?.api_url || defaultApiUrls.openai,
    api_key: "",
    model: provider?.model || defaultModels.openai,
    is_default: provider?.is_default || false,
  });

  // Model fetching for OpenRouter (public API, no key needed)
  const [openRouterModels, setOpenRouterModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [showDrop, setShowDrop] = useState(false);

  useEffect(() => {
    if (provider) {
      setForm({
        name: provider.name,
        provider: provider.provider,
        api_url: provider.api_url,
        api_key: "",
        model: provider.model,
        is_default: provider.is_default,
      });
    }
  }, [provider]);

  useEffect(() => {
    if (form.provider === "openrouter" && openRouterModels.length === 0 && !loadingModels) {
      setLoadingModels(true);
      fetch("https://openrouter.ai/api/v1/models?output_modalities=text,image")
        .then((r) => r.json())
        .then((data) => {
          const ids = (data.data || []).map((m: any) => m.id).sort();
          setOpenRouterModels(ids);
        })
        .catch(() => {})
        .finally(() => setLoadingModels(false));
    }
  }, [form.provider]);

  const handleProviderChange = (val: string) => {
    setForm({
      ...form,
      provider: val,
      api_url: defaultApiUrls[val] || form.api_url,
      model: defaultModels[val] || form.model,
    });
    if (val !== "openrouter") setOpenRouterModels([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "var(--color-bg-overlay)" }} onClick={onClose}>
      <div className="rounded-[var(--radius-lg)] border-2 overflow-hidden animate-scaleIn w-full max-w-lg"
        style={{ backgroundColor: "var(--color-bg-primary)", borderColor: "var(--color-border-primary)", boxShadow: "var(--shadow-modal)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b-2"
          style={{ borderColor: "var(--color-border-primary)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {provider ? "Edit Provider" : "Add Provider"}
          </span>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] border-2 hover:bg-[var(--color-bg-hover)] transition-colors"
            style={{ borderColor: "var(--color-border-primary)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-[var(--radius-md)] border-2 px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border-primary)", color: "var(--color-text-primary)" }}
              placeholder="My Provider" required />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>Provider Type</label>
            <Select
              value={form.provider}
              onChange={handleProviderChange}
              options={providerOptions}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>API URL</label>
            <input value={form.api_url} onChange={(e) => setForm({ ...form, api_url: e.target.value })}
              className="w-full rounded-[var(--radius-md)] border-2 px-3 py-2 text-sm outline-none font-mono"
              style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border-primary)", color: "var(--color-text-primary)" }}
              placeholder="https://api.openai.com/v1" required />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>
              API Key {provider && <span className="font-normal" style={{ color: "var(--color-text-tertiary)" }}>(leave empty to keep current)</span>}
            </label>
            <input type="password" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })}
              className="w-full rounded-[var(--radius-md)] border-2 px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border-primary)", color: "var(--color-text-primary)" }}
              placeholder={provider ? "••••••••" : "sk-..."} required={!provider} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>Model</label>
            {form.provider === "openrouter" ? (
              <div className="relative">
                {loadingModels ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--color-text-tertiary)" }} />
                    <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>Loading models...</span>
                  </div>
                ) : (
                  <>
                    <input value={form.model}
                      onChange={(e) => setForm({ ...form, model: e.target.value })}
                      onFocus={() => setShowDrop(true)}
                      onBlur={() => setTimeout(() => setShowDrop(false), 200)}
                      className="w-full rounded-[var(--radius-md)] border-2 px-3 py-2 text-sm outline-none"
                      style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border-primary)", color: "var(--color-text-primary)" }}
                      placeholder="Search models or type name..." required />
                    {showDrop && openRouterModels.length > 0 && (
                      <div className="absolute z-10 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-[var(--radius-md)] border-2 p-1"
                        style={{ backgroundColor: "var(--color-bg-primary)", borderColor: "var(--color-border-primary)", boxShadow: "var(--shadow-card)" }}>
                        {openRouterModels.filter((m) =>
                          m.toLowerCase().includes((form.model || "").toLowerCase())
                        ).length === 0 ? (
                          <p className="text-xs text-center py-2" style={{ color: "var(--color-text-tertiary)" }}>No models match</p>
                        ) : (
                          openRouterModels.filter((m) =>
                            m.toLowerCase().includes((form.model || "").toLowerCase())
                          ).map((m) => (
                            <button key={m} type="button"
                              onMouseDown={() => { setForm({ ...form, model: m }); setShowDrop(false); }}
                              className={`w-full text-left px-2.5 py-1.5 text-xs rounded-[var(--radius-sm)] transition-colors ${form.model === m ? "font-semibold" : ""}`}
                              style={{
                                backgroundColor: form.model === m ? "var(--color-accent-subtle)" : "transparent",
                                color: form.model === m ? "var(--color-accent-primary)" : "var(--color-text-secondary)",
                              }}>
                              {m}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="w-full rounded-[var(--radius-md)] border-2 px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border-primary)", color: "var(--color-text-primary)" }}
                placeholder="gpt-4o" required />
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              className="w-4 h-4 rounded border-2" style={{ accentColor: "var(--color-accent-primary)", borderColor: "var(--color-border-primary)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Set as default provider</span>
          </label>

          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={onClose}
              className="btn-brutal px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] border-2"
              style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border-primary)", color: "var(--color-text-secondary)", boxShadow: "var(--shadow-sm)" }}>Cancel</button>
            <button type="submit"
              className="btn-brutal px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] border-2"
              style={{ backgroundColor: "var(--color-accent-primary)", color: "#FFFFFF", borderColor: "var(--color-border-primary)", boxShadow: "var(--shadow-sm)" }}>
              {provider ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
