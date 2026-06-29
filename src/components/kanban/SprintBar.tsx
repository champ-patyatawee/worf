import { useState } from 'react';
import type { Sprint } from '../../types';
import { Select } from '../ui/select';
import { Plus, ChevronDown } from 'lucide-react';

interface SprintBarProps {
  sprints: Sprint[];
  activeSprintId: string | null;
  onSelectSprint: (sprintId: string | null) => void;
  onStartSprint: (sprintId: string) => void;
  onCompleteSprint: (sprintId: string) => void;
  onCreateSprint: () => void;
  boardId: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  planning: { label: 'Planning', color: '#CA8A04' },
  active: { label: 'Active', color: '#16A34A' },
  complete: { label: 'Complete', color: '#6B7280' },
};

function formatDateRange(start: string, end: string) {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${s.toLocaleDateString('en-US', opts)} - ${e.toLocaleDateString('en-US', opts)}`;
}

export function SprintBar({
  sprints,
  activeSprintId,
  onSelectSprint,
  onStartSprint,
  onCompleteSprint,
  onCreateSprint,
}: SprintBarProps) {
  const activeSprint = sprints.find((s) => s.id === activeSprintId);
  const activeStatus = activeSprint ? statusConfig[activeSprint.status] : null;

  // Only show active sprints in the selector
  const sprintOptions = sprints
    .filter((s) => s.status === 'active')
    .map((s) => ({ value: s.id, label: s.name }));

  // If there's also a Backlog option (to go back to backlog view)
  const options = [{ value: '', label: 'Backlog' }, ...sprintOptions];

  return (
    <div
      className="flex items-center gap-3 px-6 py-2.5 border-b-2 flex-shrink-0"
      style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-bg-secondary)' }}
    >
      {/* Sprint selector — only active sprints */}
      <div className="w-48">
        <Select
          value={activeSprintId || ''}
          onChange={(val) => onSelectSprint(val || null)}
          options={options}
          placeholder="Select sprint"
        />
      </div>

      {/* Sprint info */}
      {activeSprint && activeStatus ? (
        <>
          <div className="flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeStatus.color }} />
            <span style={{ color: activeStatus.color }}>{activeStatus.label}</span>
          </div>
          {activeSprint.goal && (
            <div className="flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: 'var(--color-text-secondary)' }}>
              <span className="opacity-60">Goal:</span>
              <span className="truncate max-w-[200px]">{activeSprint.goal}</span>
            </div>
          )}
          <div className="text-xs font-medium px-2 py-0.5 rounded-full border"
            style={{
              color: 'var(--color-text-secondary)',
              borderColor: 'var(--color-border-primary)',
              backgroundColor: 'var(--color-bg-tertiary)',
            }}>
            {formatDateRange(activeSprint.start_date, activeSprint.end_date)}
          </div>

          {/* Action buttons — only Complete Sprint for active sprints */}
          {activeSprint.status === 'active' && (
            <button
              onClick={() => onCompleteSprint(activeSprint.id)}
              className="ml-auto px-3 py-1.5 text-xs font-bold rounded-[var(--radius-md)] border-2 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none"
              style={{ backgroundColor: 'var(--color-accent-primary)', borderColor: 'var(--color-border-primary)', color: 'white' }}
            >
              Complete Sprint
            </button>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 ml-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full border"
            style={{
              color: 'var(--color-text-tertiary)',
              borderColor: 'var(--color-border-primary)',
              backgroundColor: 'var(--color-bg-tertiary)',
            }}>
            Backlog
          </span>
        </div>
      )}
    </div>
  );
}