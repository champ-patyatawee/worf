import { LayoutDashboard, StickyNote, Construction } from 'lucide-react';

interface PlaceholderViewProps {
  type: 'dashboard' | 'note';
}

const config = {
  dashboard: {
    icon: LayoutDashboard,
    title: 'Dashboard',
    description: 'Your workspace dashboard is coming soon.',
  },
  note: {
    icon: StickyNote,
    title: 'Notes',
    description: 'Your personal notes are coming soon.',
  },
};

export function PlaceholderView({ type }: PlaceholderViewProps) {
  const { icon: Icon, title, description } = config[type];

  return (
    <div className="flex-1 flex items-center justify-center h-full" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="flex flex-col items-center gap-4 text-center animate-fadeIn">
        <div
          className="flex items-center justify-center w-20 h-20 rounded-[var(--radius-lg)] border-2 border-[var(--color-border-primary)] shadow-[4px_4px_0px_#0D0D0D]"
          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        >
          <Icon className="h-10 w-10" style={{ color: 'var(--color-accent-primary)' }} />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </h2>
          <p className="text-[15px]" style={{ color: 'var(--color-text-secondary)' }}>
            {description}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-[var(--radius-md)] border-2 border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]">
          <Construction className="h-4 w-4" style={{ color: 'var(--color-accent-primary)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  );
}
