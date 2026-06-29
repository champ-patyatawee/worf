import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Sprint } from '../../types';

interface SprintCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; goal: string; startDate: string; endDate: string }) => void;
  sprintCount: number;
  editSprint?: Sprint | null;
}

export function SprintCreateModal({ isOpen, onClose, onCreate, sprintCount, editSprint }: SprintCreateModalProps) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editSprint) {
        setEditMode(true);
        setName(editSprint.name);
        setGoal(editSprint.goal || '');
        setStartDate(editSprint.start_date);
        setEndDate(editSprint.end_date);
      } else {
        setEditMode(false);
        setName(`Sprint ${sprintCount + 1}`);
        setGoal('');
        setStartDate('');
        setEndDate('');
      }
    }
  }, [isOpen, sprintCount, editSprint]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) return;
    onCreate({ name: name.trim(), goal: goal.trim(), startDate, endDate });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border-2 p-5"
        style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-primary)', boxShadow: '4px 4px 0px #0D0D0D' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold" style={{ color: 'var(--color-text-primary)' }}>{editMode ? 'Edit Sprint' : 'Create Sprint'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--color-bg-hover)]">
            <X className="h-4 w-4" style={{ color: 'var(--color-text-tertiary)' }} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Sprint Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus
              className="w-full px-3 py-2 text-sm border-2 rounded-[var(--radius-md)] outline-none"
              style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-primary)', color: 'var(--color-text-primary)' }}
              placeholder="Sprint name" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Goal</label>
            <textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={2}
              className="w-full px-3 py-2 text-sm border-2 rounded-[var(--radius-md)] outline-none resize-none"
              style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-primary)', color: 'var(--color-text-primary)' }}
              placeholder="Sprint goal (optional)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required
                className="w-full px-3 py-2 text-sm border-2 rounded-[var(--radius-md)] outline-none"
                style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-primary)', color: 'var(--color-text-primary)' }} />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required
                className="w-full px-3 py-2 text-sm border-2 rounded-[var(--radius-md)] outline-none"
                style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-primary)', color: 'var(--color-text-primary)' }} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-bold rounded-[var(--radius-md)] border-2 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none"
              style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-primary)', color: 'var(--color-text-primary)' }}>
              Cancel
            </button>
            <button type="submit" disabled={!name.trim() || !startDate || !endDate}
              className="px-4 py-2 text-sm font-bold rounded-[var(--radius-md)] border-2 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-accent-primary)', borderColor: 'var(--color-border-primary)', color: 'white' }}>
              {editMode ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}