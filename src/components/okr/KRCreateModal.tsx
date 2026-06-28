import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface KRCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  objectiveId: string;
}

export function KRCreateModal({ isOpen, onClose, onCreated, objectiveId }: KRCreateModalProps) {
  const [title, setTitle] = useState('');
  const [targetValue, setTargetValue] = useState<number>(0);
  const [unit, setUnit] = useState('');
  const [confidence, setConfidence] = useState<number>(5);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setTargetValue(0);
      setUnit('');
      setConfidence(5);
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || targetValue <= 0) return;
    setSaving(true);
    try {
      await invoke('create_key_result', {
        objectiveId,
        title: title.trim(),
        targetValue,
        unit: unit.trim() || null,
        confidence,
      });
      onCreated();
      onClose();
    } catch (err) {
      console.error('Failed to create key result:', err);
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
          <h2 className="text-lg font-extrabold" style={{ color: 'var(--color-text-primary)' }}>New Key Result</h2>
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
              placeholder="e.g. NPS score 50+"
              className="w-full px-3 py-2 text-sm border-2 border-[#0D0D0D] rounded-[8px] outline-none bg-white"
              style={{ color: 'var(--color-text-primary)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
              Target Value *
            </label>
            <input
              type="number"
              step="any"
              value={targetValue}
              onChange={(e) => setTargetValue(parseFloat(e.target.value) || 0)}
              placeholder="e.g. 50"
              className="w-full px-3 py-2 text-sm border-2 border-[#0D0D0D] rounded-[8px] outline-none bg-white font-mono"
              style={{ color: 'var(--color-text-primary)' }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
                Unit
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. score, %, ms"
                className="w-full px-3 py-2 text-sm border-2 border-[#0D0D0D] rounded-[8px] outline-none bg-white"
                style={{ color: 'var(--color-text-primary)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
                Confidence (1-10)
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={confidence}
                onChange={(e) => setConfidence(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full px-3 py-2 text-sm border-2 border-[#0D0D0D] rounded-[8px] outline-none bg-white font-mono"
                style={{ color: 'var(--color-text-primary)' }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-[8px] border-2 border-[#0D0D0D] bg-white hover:bg-gray-100 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={!title.trim() || targetValue <= 0 || saving}
              className="px-4 py-2 text-xs font-bold rounded-[8px] border-2 border-[#0D0D0D] bg-[var(--color-accent-primary)] text-white hover:opacity-90 transition-all disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Key Result'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}