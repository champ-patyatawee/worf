import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import type { KeyResult } from '../../types';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckedIn: () => void;
  keyResults: KeyResult[];
}

export function CheckInModal({ isOpen, onClose, onCheckedIn, keyResults }: CheckInModalProps) {
  const [values, setValues] = useState<Record<string, number>>({});
  const [confidences, setConfidences] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && keyResults.length > 0) {
      const v: Record<string, number> = {};
      const c: Record<string, number> = {};
      keyResults.forEach((kr) => {
        v[kr.id] = kr.current_value;
        c[kr.id] = kr.confidence ?? 5;
      });
      setValues(v);
      setConfidences(c);
    }
  }, [isOpen, keyResults]);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const kr of keyResults) {
        const currentValue = values[kr.id] ?? kr.current_value;
        const confidence = confidences[kr.id] ?? kr.confidence;
        if (currentValue !== kr.current_value || (confidence ?? null) !== kr.confidence) {
          await invoke('update_key_result', {
            id: kr.id,
            currentValue,
            confidence: confidence ?? null,
          });
        }
      }
      onCheckedIn();
      onClose();
    } catch (err) {
      console.error('Failed to save check-in:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}>
      <div className="w-[480px] rounded-[12px] border-2 border-[#0D0D0D] p-6 shadow-[6px_6px_0px_#0D0D0D] animate-scaleIn bg-white"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-extrabold" style={{ color: 'var(--color-text-primary)' }}>Weekly Check-in</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="h-5 w-5" style={{ color: 'var(--color-text-tertiary)' }} />
          </button>
        </div>

        <p className="text-xs font-medium mb-4" style={{ color: 'var(--color-text-tertiary)' }}>
          Update your key results for this week. How are things tracking?
        </p>

        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {keyResults.map((kr) => (
            <div key={kr.id} className="p-3 border-2 border-[#0D0D0D] rounded-[8px] bg-gray-50">
              <h4 className="text-sm font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {kr.title}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
                    Current Value
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={values[kr.id] ?? kr.current_value}
                    onChange={(e) => setValues({ ...values, [kr.id]: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 text-sm border-2 border-[#0D0D0D] rounded-[6px] outline-none bg-white font-mono"
                    style={{ color: 'var(--color-text-primary)' }}
                  />
                  {kr.unit && (
                    <span className="text-[10px] font-medium ml-1" style={{ color: 'var(--color-text-tertiary)' }}>
                      {kr.unit}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
                    Confidence
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={confidences[kr.id] ?? kr.confidence ?? 5}
                      onChange={(e) => setConfidences({ ...confidences, [kr.id]: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-xs font-mono font-bold w-6 text-center">
                      {confidences[kr.id] ?? kr.confidence ?? 5}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-1 text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                Target: {kr.target_value} {kr.unit || ''}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-5 pt-3 border-t-2 border-gray-200">
          <button onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-[8px] border-2 border-[#0D0D0D] bg-white hover:bg-gray-100 transition-all">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || keyResults.length === 0}
            className="px-4 py-2 text-xs font-bold rounded-[8px] border-2 border-[#0D0D0D] bg-[var(--color-accent-primary)] text-white hover:opacity-90 transition-all disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Check-in'}
          </button>
        </div>
      </div>
    </div>
  );
}