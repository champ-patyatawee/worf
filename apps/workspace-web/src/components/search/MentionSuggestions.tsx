import { useState, useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';
import { Hash, MessageCircle, Bot } from 'lucide-react';

interface User {
  id: string;
  name: string;
  avatar?: string | null;
}

interface Agent {
  id: string;
  name: string;
  displayName?: string;
}

interface Channel {
  id: string;
  name: string;
}

interface MentionSuggestionsProps {
  type: 'user' | 'channel';
  query: string;
  users?: User[];
  agents?: Agent[];
  channels?: Channel[];
  onSelect: (name: string) => void;
  onClose: () => void;
  position: { top: number; left: number; width: number };
}

export function MentionSuggestions({
  type,
  query,
  users = [],
  agents = [],
  channels = [],
  onSelect,
  onClose,
  position,
}: MentionSuggestionsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const lowerQuery = query.toLowerCase();

  const filteredUsers = type === 'user'
    ? users.filter(u => u.name.toLowerCase().includes(lowerQuery)).slice(0, 3)
    : [];

  const filteredAgents = type === 'user'
    ? agents.filter(a => a.name.toLowerCase().includes(lowerQuery)).slice(0, 3)
    : [];

  const filteredChannels = type === 'channel'
    ? channels.filter(c => c.name.toLowerCase().includes(lowerQuery)).slice(0, 5)
    : [];

  const items = type === 'user' 
    ? [...filteredAgents, ...filteredUsers] 
    : filteredChannels;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, type]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && items.length > 0) {
        e.preventDefault();
        onSelect(items[selectedIndex].name);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIndex, onSelect, onClose]);

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
          'fixed z-50 bg-[var(--color-bg-primary)] rounded-[var(--radius-lg)]',
          'border-2 border-[var(--color-border-primary)] overflow-hidden',
          'animate-scaleIn'
        )}
        style={{ top: position.top, left: position.left, width: position.width, boxShadow: '6px 6px 0px #0D0D0D' }}
      >
        <div className="px-3 py-2 text-sm text-text-tertiary text-center">
          No {type === 'user' ? 'users' : 'channels'} found
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed z-50 bg-[var(--color-bg-primary)] rounded-[var(--radius-lg)]',
        'border-2 border-[var(--color-border-primary)] overflow-hidden',
        'animate-scaleIn max-h-64 overflow-y-auto'
      )}
      style={{ top: position.top, left: position.left, width: position.width, boxShadow: '6px 6px 0px #0D0D0D' }}
    >
      <div className="py-1 divide-y divide-[var(--color-border-secondary)]">
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.name)}
            className={cn(
              'w-full px-3 py-2 flex items-center gap-3 text-left',
              'transition-colors-fast',
              index === selectedIndex
                ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent-primary)]'
                : 'text-text-primary hover:bg-bg-hover'
            )}
          >
            <span className="flex-shrink-0 w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--color-bg-secondary)] border-2 border-[var(--color-border-primary)] flex items-center justify-center">
              {type === 'user' && index < filteredAgents.length ? (
                <Bot className="h-4 w-4 text-text-tertiary" />
              ) : type === 'user' ? (
                <MessageCircle className="h-4 w-4 text-text-tertiary" />
              ) : (
                <Hash className="h-4 w-4 text-text-tertiary" />
              )}
            </span>
            <span className="font-medium truncate">
              {type === 'channel' ? '#' : ''}{item.name}
              {'displayName' in item && item.displayName && item.displayName !== item.name && (
                <span className="text-xs text-text-tertiary ml-1">({item.displayName})</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
