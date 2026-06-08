import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface CreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  placeholder?: string;
  title?: string;
}

export function CreateDialog({ isOpen, onClose, onCreate, placeholder = 'Name...', title = 'Create' }: CreateDialogProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim());
      setName('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}>
      <div className="w-80 rounded-[var(--radius-lg)] border-2 p-5 animate-scaleIn"
        style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-primary)', boxShadow: 'var(--shadow-modal)' }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-extrabold" style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--color-bg-hover)]">
            <X className="h-4 w-4" style={{ color: 'var(--color-text-tertiary)' }} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input ref={inputRef} type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder={placeholder} autoFocus
            className="w-full px-3 py-2 text-sm border-2 rounded-[var(--radius-md)] outline-none"
            style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-primary)', color: 'var(--color-text-primary)' }} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose}
              className="px-3 py-1.5 text-xs font-bold rounded-[var(--radius-md)] border-2 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none"
              style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-primary)', color: 'var(--color-text-primary)' }}>Cancel</button>
            <button type="submit" disabled={!name.trim()}
              className="px-3 py-1.5 text-xs font-bold rounded-[var(--radius-md)] border-2 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-accent-primary)', borderColor: 'var(--color-border-primary)', color: 'white' }}>Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}
