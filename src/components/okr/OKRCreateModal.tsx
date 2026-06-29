import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface OKRCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (quarter: string, year: number) => void;
  defaultQuarter: string;
  defaultYear: number;
}

export function OKRCreateModal({ isOpen, onClose, onCreated, defaultQuarter, defaultYear }: OKRCreateModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quarter, setQuarter] = useState(defaultQuarter);
  const [year, setYear] = useState(defaultYear);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setQuarter(defaultQuarter);
      setYear(defaultYear);
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [isOpen, defaultQuarter, defaultYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await invoke('create_objective', {
        title: title.trim(),
        description: description.trim() || null,
        quarter,
        year,
      });
      onCreated(quarter, year);
      onClose();
    } catch (err) {
      console.error('Failed to create objective:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}>
      <div className="w-[420px] rounded-[12px] border-2 border-[#0D0D0D] p-6 shadow-[6px_6px_0px_#0D0D0D] animate-scaleIn bg-white"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-extrabold" style={{ color: 'var(--color-text-primary)' }}>New Objective</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="h-5 w-5" style={{ color: 'var(--color-text-tertiary)' }} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
              Title *
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Delight our users"
              className="w-full px-3 py-2 text-sm border-2 border-[#0D0D0D] rounded-[8px] outline-none bg-white"
              style={{ color: 'var(--color-text-primary)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does success look like?"
              rows={3}
              className="w-full px-3 py-2 text-sm border-2 border-[#0D0D0D] rounded-[8px] outline-none bg-white resize-none"
              style={{ color: 'var(--color-text-primary)' }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
                Quarter
              </label>
              <select
                value={quarter}
                onChange={(e) => setQuarter(e.target.value)}
                className="w-full px-3 py-2 text-sm border-2 border-[#0D0D0D] rounded-[8px] outline-none bg-white font-bold cursor-pointer"
                style={{ color: 'var(--color-text-primary)' }}
              >
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
                Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 text-sm border-2 border-[#0D0D0D] rounded-[8px] outline-none bg-white font-bold cursor-pointer"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-[8px] border-2 border-[#0D0D0D] bg-white hover:bg-gray-100 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={!title.trim() || saving}
              className="px-4 py-2 text-xs font-bold rounded-[8px] border-2 border-[#0D0D0D] bg-[var(--color-accent-primary)] text-white hover:opacity-90 transition-all disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Objective'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}