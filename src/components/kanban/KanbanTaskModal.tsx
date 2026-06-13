import { useState, useEffect } from 'react';
import type { Task } from '../../types';
import { X } from 'lucide-react';
import { Select } from '../ui/select';

export function KanbanTaskModal({ isOpen, onClose, onSave, task }: {
  isOpen: boolean; onClose: () => void;
  onSave: (d: { title: string; description: string; priority: string; status: string }) => void;
  task: Task | null;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('todo');

  useEffect(() => {
    if (task) { setTitle(task.title); setDescription(task.description || ''); setPriority(task.priority); setStatus(task.status); }
    else { setTitle(''); setDescription(''); setPriority('medium'); setStatus('todo'); }
  }, [task, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border-2 p-5"
        style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-primary)', boxShadow: '4px 4px 0px #0D0D0D' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold" style={{ color: 'var(--color-text-primary)' }}>{task ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--color-bg-hover)]"><X className="h-4 w-4" style={{ color: 'var(--color-text-tertiary)' }} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (title.trim()) onSave({ title: title.trim(), description: description.trim(), priority, status }); }} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
              className="w-full px-3 py-2 text-sm border-2 rounded-[var(--radius-md)] outline-none"
              style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-primary)', color: 'var(--color-text-primary)' }} placeholder="Task title" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="w-full px-3 py-2 text-sm border-2 rounded-[var(--radius-md)] outline-none resize-none"
              style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-primary)', color: 'var(--color-text-primary)' }} placeholder="Task description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Priority</label>
              <Select
                value={priority}
                onChange={setPriority}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Status</label>
              <Select
                value={status}
                onChange={setStatus}
                options={[
                  { value: 'todo', label: 'To Do' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'done', label: 'Done' },
                ]}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-bold rounded-[var(--radius-md)] border-2 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none"
              style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-primary)', color: 'var(--color-text-primary)' }}>Cancel</button>
            <button type="submit" disabled={!title.trim()}
              className="px-4 py-2 text-sm font-bold rounded-[var(--radius-md)] border-2 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-accent-primary)', borderColor: 'var(--color-border-primary)', color: 'white' }}>{task ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
