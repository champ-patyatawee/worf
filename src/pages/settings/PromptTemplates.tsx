import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Star, X } from "lucide-react";
import { promptTemplateStore, type PromptTemplate } from "../../stores/promptTemplateStore";

export function PromptTemplates() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PromptTemplate | null>(null);

  const load = async () => {
    await promptTemplateStore.fetchTemplates();
    setTemplates(promptTemplateStore.templates);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (data: { name: string; content: string; description?: string; is_default?: boolean }) => {
    try {
      if (editing) {
        await promptTemplateStore.updateTemplate(editing.id, data);
      } else {
        await promptTemplateStore.createTemplate(data);
      }
      setShowModal(false);
      setEditing(null);
      await load();
    } catch (err) {
      console.error("Failed to save template:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    try {
      await promptTemplateStore.deleteTemplate(id);
      await load();
    } catch (err) {
      console.error("Failed to delete template:", err);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>Prompt Templates</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-tertiary)" }}>Manage your AI prompt templates for chat sessions</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }}
          className="btn-brutal flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-[var(--radius-md)] border-2"
          style={{ backgroundColor: "var(--color-accent-primary)", color: "#FFFFFF", borderColor: "var(--color-border-primary)", boxShadow: "var(--shadow-sm)" }}>
          <Plus className="w-4 h-4" /> Add Template
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-sm" style={{ color: "var(--color-text-tertiary)" }}>Loading...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 rounded-[var(--radius-lg)] border-2" style={{ borderColor: "var(--color-border-primary)", color: "var(--color-text-tertiary)" }}>
          No templates yet. Create your first prompt template.
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="rounded-[var(--radius-lg)] border-2 p-4"
              style={{ backgroundColor: "var(--color-bg-primary)", borderColor: "var(--color-border-primary)", boxShadow: "var(--shadow-card)" }}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>{t.name}</h3>
                    {t.is_default && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-[var(--radius-sm)] border"
                        style={{ backgroundColor: "rgba(74,222,128,0.1)", color: "var(--color-success)", borderColor: "rgba(74,222,128,0.3)" }}>
                        <Star className="w-3 h-3" /> Default
                      </span>
                    )}
                  </div>
                  {t.description && <p className="text-xs mb-2" style={{ color: "var(--color-text-tertiary)" }}>{t.description}</p>}
                  <div className="rounded-[var(--radius-sm)] border p-2" style={{ backgroundColor: "var(--color-bg-tertiary)", borderColor: "var(--color-border-secondary)" }}>
                    <pre className="text-xs font-mono whitespace-pre-wrap line-clamp-3" style={{ color: "var(--color-text-secondary)" }}>{t.content}</pre>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                  <button onClick={() => { setEditing(t); setShowModal(true); }}
                    className="btn-brutal w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] border-2"
                    style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border-primary)", boxShadow: "var(--shadow-sm)" }}>
                    <Pencil className="w-3.5 h-3.5" style={{ color: "var(--color-text-tertiary)" }} />
                  </button>
                  <button onClick={() => handleDelete(t.id)}
                    className="btn-brutal w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] border-2"
                    style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border-primary)", boxShadow: "var(--shadow-sm)", color: "var(--color-error)" }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <TemplateModal
          template={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function TemplateModal({ template, onClose, onSave }: {
  template: PromptTemplate | null;
  onClose: () => void;
  onSave: (data: { name: string; content: string; description?: string; is_default?: boolean }) => void;
}) {
  const [name, setName] = useState(template?.name || "");
  const [content, setContent] = useState(template?.content || "");
  const [description, setDescription] = useState(template?.description || "");
  const [isDefault, setIsDefault] = useState(template?.is_default || false);

  useEffect(() => {
    if (template) { setName(template.name); setContent(template.content); setDescription(template.description || ""); setIsDefault(template.is_default); }
    else { setName(""); setContent(""); setDescription(""); setIsDefault(false); }
  }, [template]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;
    onSave({ name: name.trim(), content: content.trim(), description: description.trim() || undefined, is_default: isDefault });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "var(--color-bg-overlay)" }} onClick={onClose}>
      <div className="rounded-[var(--radius-lg)] border-2 overflow-hidden w-full max-w-lg animate-scaleIn"
        style={{ backgroundColor: "var(--color-bg-primary)", borderColor: "var(--color-border-primary)", boxShadow: "var(--shadow-modal)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b-2" style={{ borderColor: "var(--color-border-primary)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{template ? "Edit Template" : "Add Template"}</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] border-2 hover:bg-[var(--color-bg-hover)]" style={{ borderColor: "var(--color-border-primary)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Code Assistant" required
              className="w-full rounded-[var(--radius-md)] border-2 px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border-primary)", color: "var(--color-text-primary)" }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>Description (optional)</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description"
              className="w-full rounded-[var(--radius-md)] border-2 px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border-primary)", color: "var(--color-text-primary)" }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>Prompt Content</label>
            <p className="text-xs mb-2" style={{ color: "var(--color-text-tertiary)" }}>Used as the system prompt for AI chat sessions using this template.</p>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} required
              className="w-full rounded-[var(--radius-md)] border-2 px-3 py-2 text-sm font-mono outline-none resize-none"
              style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border-primary)", color: "var(--color-text-primary)" }}
              placeholder="You are a helpful AI assistant..." />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded border-2" style={{ accentColor: "var(--color-accent-primary)", borderColor: "var(--color-border-primary)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Set as default template</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="btn-brutal px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] border-2"
              style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border-primary)", color: "var(--color-text-secondary)", boxShadow: "var(--shadow-sm)" }}>Cancel</button>
            <button type="submit"
              className="btn-brutal px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] border-2"
              style={{ backgroundColor: "var(--color-accent-primary)", color: "#FFFFFF", borderColor: "var(--color-border-primary)", boxShadow: "var(--shadow-sm)" }}>{template ? "Save" : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
