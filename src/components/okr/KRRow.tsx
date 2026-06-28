import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { KeyResult } from '../../types';

interface KRRowProps {
  keyResult: KeyResult;
  onUpdate: (id: string, currentValue: number, confidence?: number | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function KRRow({ keyResult, onUpdate, onDelete }: KRRowProps) {
  const [editing, setEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(keyResult.current_value);
  const [confidence, setConfidence] = useState(keyResult.confidence ?? 5);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const kr = keyResult;
  const totalRange = kr.target_value - kr.initial_value;
  const progress = totalRange > 0 ? (kr.current_value - kr.initial_value) / totalRange : 0;
  const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));

  const confidenceColor = kr.confidence == null ? '#9CA3AF' : kr.confidence >= 7 ? '#22C55E' : kr.confidence >= 4 ? '#EAB308' : '#EF4444';
  const confidenceIcon = kr.confidence == null ? '—' : kr.confidence >= 7 ? '🟢' : kr.confidence >= 4 ? '🟡' : '🔴';

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(kr.id, currentValue, confidence);
      setEditing(false);
    } catch (err) {
      console.error('Failed to update KR:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(kr.id);
    } catch (err) {
      console.error('Failed to delete KR:', err);
    }
  };

  return (
    <div className="p-4 border-2 border-[#0D0D0D] rounded-[12px] bg-white shadow-[3px_3px_0px_#0D0D0D]">
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-extrabold text-sm" style={{ color: 'var(--color-text-primary)' }}>
          {kr.title}
        </h4>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditing(!editing)}
            className="p-1.5 rounded-[6px] border-2 border-[#0D0D0D] hover:bg-gray-100 transition-all"
            aria-label="Edit KR"
          >
            <Pencil className="h-3.5 w-3.5" style={{ color: 'var(--color-text-secondary)' }} />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDelete}
                className="px-2 py-1 text-[10px] font-bold rounded-[6px] border-2 border-[#0D0D0D] bg-red-100 text-red-600 hover:bg-red-200 transition-all"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 text-[10px] font-bold rounded-[6px] border-2 border-[#0D0D0D] bg-white hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-[6px] border-2 border-[#0D0D0D] hover:bg-red-50 transition-all"
              aria-label="Delete KR"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </button>
          )}
        </div>
      </div>

      {/* Progress visualization */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
            {kr.initial_value} {kr.unit || ''}
          </span>
          <span className="text-xs font-mono font-bold" style={{ color: 'var(--color-accent-primary)' }}>
            {kr.current_value} {kr.unit || ''}
          </span>
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
            {kr.target_value} {kr.unit || ''}
          </span>
        </div>
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden border border-[#0D0D0D]">
          <div
            className="h-full transition-all duration-500 rounded-full"
            style={{
              width: `${pct}%`,
              backgroundColor: pct >= 70 ? '#22C55E' : pct >= 40 ? '#EAB308' : '#EF4444',
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            {pct}%
          </span>
          <span className="text-[10px] font-semibold" style={{ color: confidenceColor }}>
            {confidenceIcon} Confidence: {kr.confidence ?? '—'}/10
          </span>
        </div>
      </div>

      {/* Inline edit */}
      {editing && (
        <div className="mt-3 pt-3 border-t-2 border-gray-200">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
                Current Value
              </label>
              <input
                type="number"
                step="any"
                value={currentValue}
                onChange={(e) => setCurrentValue(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 text-sm border-2 border-[#0D0D0D] rounded-[8px] outline-none bg-white font-mono"
                style={{ color: 'var(--color-text-primary)' }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
                Confidence (1-10)
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={confidence}
                onChange={(e) => setConfidence(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full px-2.5 py-1.5 text-sm border-2 border-[#0D0D0D] rounded-[8px] outline-none bg-white font-mono"
                style={{ color: 'var(--color-text-primary)' }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 text-xs font-bold rounded-[8px] border-2 border-[#0D0D0D] bg-white hover:bg-gray-100 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-bold rounded-[8px] border-2 border-[#0D0D0D] bg-[var(--color-accent-primary)] text-white hover:opacity-90 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}