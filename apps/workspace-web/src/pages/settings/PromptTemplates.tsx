import { useState, useEffect } from 'react';
import { Button, Input, Modal } from '@/components/common';
import { Plus, Pencil, Trash2, Star } from 'lucide-react';
import { usePromptTemplateStore, type PromptTemplate } from '@/stores/promptTemplateStore';

interface TemplateFormData {
  name: string;
  content: string;
  description: string;
  isDefault: boolean;
}

export function PromptTemplates() {
  const { templates, isLoading, fetchTemplates, createTemplate, updateTemplate, deleteTemplate } = usePromptTemplateStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<PromptTemplate | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleAdd = () => {
    setEditingTemplate(null);
    setIsModalOpen(true);
  };

  const handleEdit = (template: PromptTemplate) => {
    setEditingTemplate(template);
    setIsModalOpen(true);
  };

  const handleDelete = (template: PromptTemplate) => {
    setDeletingTemplate(template);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (deletingTemplate) {
      try {
        await deleteTemplate(deletingTemplate.id);
      } catch (err) {
        console.error('Failed to delete template:', err);
      }
      setIsDeleteModalOpen(false);
      setDeletingTemplate(null);
    }
  };

  const handleSave = async (data: TemplateFormData) => {
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, data);
      } else {
        await createTemplate(data);
      }
      setIsModalOpen(false);
      setEditingTemplate(null);
    } catch (err) {
      console.error('Failed to save template:', err);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Prompt Templates</h1>
          <p className="text-sm text-text-tertiary">Manage your AI prompt templates</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Template
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-text-tertiary">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="bg-bg-primary rounded-[var(--radius-lg)] border-2 border-[var(--color-border-primary)] shadow-[var(--shadow-card)] p-8 text-center text-text-tertiary">
          No templates yet. Create your first prompt template.
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-bg-primary rounded-[var(--radius-lg)] border-2 border-[var(--color-border-primary)] p-4 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-text-primary truncate">{template.name}</h3>
                    {template.isDefault && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-[var(--radius-sm)] bg-status-success/10 text-status-success border border-status-success/30">
                        <Star className="h-3 w-3" />
                        Default
                      </span>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-text-tertiary mb-2">{template.description}</p>
                  )}
                  <div className="bg-bg-tertiary rounded-[var(--radius-sm)] p-3 border border-[var(--color-border-secondary)]">
                    <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap line-clamp-3">
                      {template.content}
                    </pre>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(template)}
                    className="p-1.5 rounded hover:bg-bg-hover transition-colors-fast"
                  >
                    <Pencil className="h-4 w-4 text-text-tertiary" />
                  </button>
                  <button
                    onClick={() => handleDelete(template)}
                    className="p-1.5 rounded hover:bg-bg-hover transition-colors-fast"
                  >
                    <Trash2 className="h-4 w-4 text-status-error" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <TemplateModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTemplate(null); }}
        onSave={handleSave}
        template={editingTemplate}
      />

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Template">
        <p className="text-text-secondary mb-4">
          Delete template <span className="font-medium text-text-primary">{deletingTemplate?.name}</span>? This cannot be undone.
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

function TemplateModal({
  isOpen,
  onClose,
  onSave,
  template,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TemplateFormData) => void;
  template: PromptTemplate | null;
}) {
  const [formData, setFormData] = useState<TemplateFormData>({
    name: template?.name || '',
    content: template?.content || '',
    description: template?.description || '',
    isDefault: template?.isDefault || false,
  });

  useEffect(() => {
    setFormData({
      name: template?.name || '',
      content: template?.content || '',
      description: template?.description || '',
      isDefault: template?.isDefault || false,
    });
  }, [template]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={template ? 'Edit Template' : 'Add Template'} className="max-w-2xl">
      <form onSubmit={handleSubmit} className="p-5">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Code Assistant, Creative Writer"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Description (optional)</label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of when to use this template"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Prompt Content</label>
            <p className="text-xs text-text-tertiary mb-2">
              This will be used as the system prompt for AI chat sessions using this template.
            </p>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full h-48 px-3 py-2 bg-[var(--color-bg-secondary)] border-2 border-[var(--color-border-primary)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] text-sm font-mono resize-none focus:outline-none focus:shadow-[4px_4px_0px_#0D0D0D] focus:border-[var(--color-accent-primary)]"
              placeholder={`You are a helpful AI assistant. Answer questions concisely and accurately.`}
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="rounded border-[var(--color-border-primary)]"
            />
            <label htmlFor="isDefault" className="text-sm font-medium text-text-primary">
              Set as default template
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 mt-4 border-t-2 border-[var(--color-border-primary)]">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}
