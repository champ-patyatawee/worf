import { useState, useEffect, useRef } from 'react';
import { X, Folder } from 'lucide-react';

interface FolderCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (name: string) => void;
}

export function FolderCreateModal({ isOpen, onClose, onCreated }: FolderCreateModalProps) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onCreated(name.trim());
      onClose();
    } catch (err) {
      console.error('Failed to create folder:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}>
      <div className="w-[380px] rounded-[12px] border-2 border-[#0D0D0D] p-6 shadow-[6px_6px_0px_#0D0D0D] animate-scaleIn bg-white"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5" style={{ color: 'var(--color-text-primary)' }} />
            <h2 className="text-lg font-extrabold" style={{ color: 'var(--color-text-primary)' }}>New Folder</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="h-5 w-5" style={{ color: 'var(--color-text-tertiary)' }} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
              Folder Name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Work Notes"
              className="w-full px-3 py-2 text-sm border-2 border-[#0D0D0D] rounded-[8px] outline-none bg-white"
              style={{ color: 'var(--color-text-primary)' }}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-[8px] border-2 border-[#0D0D0D] bg-white hover:bg-gray-100 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={!name.trim() || saving}
              className="px-4 py-2 text-xs font-bold rounded-[8px] border-2 border-[#0D0D0D] bg-[var(--color-accent-primary)] text-white hover:opacity-90 transition-all disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
