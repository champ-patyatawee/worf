import { useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';

interface Agent {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  isActive: boolean;
  slashCommand?: string;
  webViewUrl?: string;
}

interface SuggestionItem {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  icon?: string;
  url?: string;
  type: 'slash' | 'user' | 'agent' | 'channel';
}

interface SlashCommandSuggestionsProps {
  query: string;
  items: SuggestionItem[];
  selectedIndex: number;
  onSelect: (item: SuggestionItem) => void;
  onClose: () => void;
  position: { top: number; left: number; width: number };
}

export function SlashCommandSuggestions({
  query,
  items,
  selectedIndex,
  onSelect,
  onClose,
  position,
}: SlashCommandSuggestionsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (items.length === 0) {
    return (
      <div
        ref={containerRef}
        className={cn(
          'fixed z-50 w-72 bg-[var(--color-bg-secondary)] rounded-[var(--radius-lg)]',
          'border-2 border-[var(--color-border-primary)] overflow-hidden',
          'shadow-[4px_4px_0px_#0D0D0D] animate-scaleIn'
        )}
        style={{ top: position.top, left: position.left, width: position.width }}
      >
        <div className="px-3 py-2 text-sm text-[var(--color-text-tertiary)] text-center font-medium">
          No commands found
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed z-50 w-72 bg-[var(--color-bg-secondary)] rounded-[var(--radius-lg)]',
        'border-2 border-[var(--color-border-primary)] overflow-hidden',
        'shadow-[4px_4px_0px_#0D0D0D] animate-scaleIn max-h-64 overflow-y-auto scrollbar-thin'
      )}
      style={{ top: position.top, left: position.left, width: position.width }}
    >
      <div className="py-1">
        {items.map((item, index) => (
          <button
            key={item.id}
            ref={index === selectedIndex ? selectedRef : null}
            onClick={() => onSelect(item)}
            className={cn(
              'w-full px-3 py-2 flex items-center gap-3 text-left',
              'transition-colors-fast border-2 border-transparent',
              index === selectedIndex
                ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent-primary)] border-[var(--color-border-primary)]'
                : 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
            )}
          >
            <span className="flex-shrink-0 w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] flex items-center justify-center text-sm border-2 border-[var(--color-border-primary)] font-bold">
              {item.type === 'slash' && '📋'}
              {item.type === 'user' && '👤'}
              {item.type === 'agent' && '🤖'}
              {item.type === 'channel' && '#'}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold truncate">
                  {item.type === 'slash' ? '/' : ''}{item.name}
                </span>
                {item.displayName && item.displayName !== item.name && (
                  <span className="text-xs text-[var(--color-text-tertiary)] truncate">
                    {item.displayName}
                  </span>
                )}
              </div>
              {item.description && (
                <p className="text-xs text-[var(--color-text-tertiary)] truncate">
                  {item.description}
                </p>
              )}
            </div>
            {item.type === 'slash' && (
              <span className="flex-shrink-0 text-xs text-[var(--color-text-tertiary)] font-medium">
                Open
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function getSuggestionItems(
  type: 'slash' | 'user' | 'agent' | 'channel',
  agents: Agent[],
  users: { id: string; name: string }[],
  channels: { id: string; name: string }[],
  query: string
): SuggestionItem[] {
  const lowerQuery = query.toLowerCase();

  if (type === 'slash') {
    return agents
      .filter(
        (a) =>
          a.isActive &&
          a.slashCommand &&
          a.slashCommand.toLowerCase().includes(lowerQuery)
      )
      .map((a) => ({
        id: a.id,
        name: a.slashCommand!.replace(/^\//, ''),
        displayName: a.displayName,
        description: a.description,
        url: a.webViewUrl,
        type: 'slash' as const,
      }));
  }

  if (type === 'user') {
    const filteredUsers = users.filter((u) =>
      u.name.toLowerCase().includes(lowerQuery)
    );
    const filteredAgents = agents
      .filter(
        (a) =>
          a.isActive &&
          a.name.toLowerCase().includes(lowerQuery)
      )
      .map((a) => ({
        id: a.id,
        name: a.name,
        displayName: a.displayName,
        type: 'agent' as const,
      }));

    return [...filteredAgents, ...filteredUsers.map((u) => ({
      id: u.id,
      name: u.name,
      type: 'user' as const,
    }))];
  }

  if (type === 'channel') {
    return channels
      .filter((c) => c.name.toLowerCase().includes(lowerQuery))
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: 'channel' as const,
      }));
  }

  return [];
}
