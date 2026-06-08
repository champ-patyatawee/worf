import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Save, Brain } from "lucide-react";
import { Select } from "../../components/ui/select";

interface AIProvider {
  id: string;
  name: string;
  provider: string;
  model: string;
  is_active: boolean;
}

export function NoteSettings() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [noteProviderId, setNoteProviderId] = useState("");
  const [currentNoteProvider, setCurrentNoteProvider] = useState<AIProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const providers = await invoke<AIProvider[]>("list_providers");
      const activeProviders = providers.filter((p) => p.is_active);
      setProviders(activeProviders);

      const savedId = await invoke<string | null>("get_setting", { key: "note_ai_provider_id" });
      if (savedId) {
        setNoteProviderId(savedId);
        const match = activeProviders.find((p) => p.id === savedId);
        if (match) setCurrentNoteProvider(match);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!noteProviderId) {
      setMessage({ type: "error", text: "Please select a provider" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await invoke("set_setting", { key: "note_ai_provider_id", value: noteProviderId });
      const match = providers.find((p) => p.id === noteProviderId);
      setCurrentNoteProvider(match || null);
      setMessage({ type: "success", text: "Note AI provider saved!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[200px]">
        <div
          className="w-6 h-6 border-2 rounded-full animate-spin"
          style={{
            borderColor: "var(--color-border-primary)",
            borderTopColor: "var(--color-accent-primary)",
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
          Note AI Provider
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-tertiary)" }}>
          Select which AI provider the Note editor should use for AI features
          (completion, generation, editing).
        </p>
      </div>

      {message && (
        <div
          className="mb-4 p-3 rounded-[var(--radius-md)] text-sm border-2 animate-fadeIn"
          style={{
            backgroundColor:
              message.type === "success"
                ? "rgba(74, 222, 128, 0.1)"
                : "rgba(251, 113, 133, 0.1)",
            color:
              message.type === "success"
                ? "var(--color-success)"
                : "var(--color-error)",
            borderColor:
              message.type === "success"
                ? "rgba(74, 222, 128, 0.3)"
                : "rgba(251, 113, 133, 0.3)",
          }}
        >
          {message.text}
        </div>
      )}

      <div
        className="rounded-[var(--radius-lg)] border-2 p-6 max-w-xl"
        style={{
          backgroundColor: "var(--color-bg-primary)",
          borderColor: "var(--color-border-primary)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Current provider info */}
        {currentNoteProvider && (
          <div
            className="mb-6 p-3 rounded-[var(--radius-md)] border-2"
            style={{
              backgroundColor: "var(--color-bg-tertiary)",
              borderColor: "var(--color-border-primary)",
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-tertiary)" }}>
              Currently Active
            </p>
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4" style={{ color: "var(--color-accent-primary)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                {currentNoteProvider.name}
                <span className="ml-2" style={{ color: "var(--color-text-tertiary)" }}>
                  ({currentNoteProvider.provider} — {currentNoteProvider.model})
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Provider selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>
            Provider
          </label>
          <p className="text-xs mb-2" style={{ color: "var(--color-text-tertiary)" }}>
            Choose an AI provider for the Note editor to use.
          </p>
          <Select
            value={noteProviderId}
            onChange={(value) => {
              setNoteProviderId(value);
              setMessage(null);
            }}
            placeholder="-- Select a provider --"
            options={providers.map(p => ({ value: p.id, label: `${p.name} (${p.provider} — ${p.model})` }))}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t-2" style={{ borderColor: "var(--color-border-primary)" }}>
          <button
            onClick={() => {
              setNoteProviderId("");
              setMessage(null);
            }}
            className="btn-brutal px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] border-2"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              borderColor: "var(--color-border-primary)",
              color: "var(--color-text-secondary)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            Clear
          </button>
          <button
            onClick={handleSave}
            disabled={!noteProviderId || saving}
            className="btn-brutal flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] border-2"
            style={{
              backgroundColor: noteProviderId
                ? "var(--color-accent-primary)"
                : "var(--color-bg-tertiary)",
              color: noteProviderId ? "#FFFFFF" : "var(--color-text-tertiary)",
              borderColor: "var(--color-border-primary)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
