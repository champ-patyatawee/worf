import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Loader2, Check } from "lucide-react";
import { Select, type SelectOption } from "../../components/ui/select";

export function NoteSettings() {
  const [providers, setProviders] = useState<SelectOption[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadProviders();
    loadCurrentSetting();
  }, []);

  const loadProviders = async () => {
    try {
      const data = await invoke<any[]>("list_providers");
      const activeProviders = data.filter((p: any) => p.is_active);
      setProviders([
        { value: "", label: "None (use default)" },
        ...activeProviders.map((p: any) => ({
          value: p.id,
          label: p.name,
        })),
      ]);
    } catch (err) {
      console.error("Failed to load providers:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentSetting = async () => {
    try {
      const settings = await invoke<any[]>("list_settings");
      const noteProvider = settings.find(
        (s: any) => s.key === "note_ai_provider_id"
      );
      if (noteProvider) {
        setSelectedProviderId(noteProvider.value);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const handleChange = async (value: string) => {
    setSelectedProviderId(value);
    setSaving(true);
    setSaved(false);
    try {
      await invoke("set_setting", {
        key: "note_ai_provider_id",
        value,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save setting:", err);
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
      <h1
        className="text-lg font-bold mb-1"
        style={{ color: "var(--color-text-primary)" }}
      >
        Note Settings
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--color-text-tertiary)" }}>
        Configure AI provider and other preferences for notes
      </p>

      {/* AI Provider Selection */}
      <div
        className="p-4 rounded-[var(--radius-md)] border-2 max-w-xl"
        style={{
          backgroundColor: "var(--color-bg-tertiary)",
          borderColor: "var(--color-border-primary)",
        }}
      >
        <label
          className="block text-sm font-semibold mb-1"
          style={{ color: "var(--color-text-primary)" }}
        >
          Note AI Provider
        </label>
        <p
          className="text-xs mb-3"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          Select which AI provider to use for note generation and editing
        </p>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Select
              value={selectedProviderId}
              onChange={handleChange}
              options={providers}
              placeholder="Select a provider..."
            />
          </div>
          {saving && (
            <Loader2
              className="w-4 h-4 animate-spin flex-shrink-0"
              style={{ color: "var(--color-text-tertiary)" }}
            />
          )}
          {saved && (
            <Check
              className="w-4 h-4 flex-shrink-0"
              style={{ color: "var(--color-success)" }}
            />
          )}
        </div>

        {!selectedProviderId && (
          <p
            className="text-xs mt-2"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Default provider will be used. Configure providers in{" "}
            <a
              href="/settings/ai"
              className="underline"
              style={{ color: "var(--color-accent-primary)" }}
            >
              AI Providers settings
            </a>
            .
          </p>
        )}
      </div>
    </div>
  );
}