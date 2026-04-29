import { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';
import { cn } from '@/utils/cn';

const EMOJI_CATEGORIES = [
  { name: 'Recent', emojis: ['👍', '❤️', '😂', '😮', '😢', '🙏'] },
  { name: 'Smileys', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕'] },
  { name: 'Gestures', emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'] },
  { name: 'Objects', emojis: ['💯', '🔥', '✨', '⭐', '🌟', '💫', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🎯', '💡', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'] },
];

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  className?: string;
}

export function ReactionPicker({ onSelect, className }: ReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const [position, setPosition] = useState<'left' | 'right'>('left');
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const popupWidth = 288;
      const spaceOnRight = window.innerWidth - buttonRect.right;
      const spaceOnLeft = buttonRect.left;

      if (spaceOnRight < popupWidth && spaceOnRight < spaceOnLeft) {
        setPosition('right');
      } else {
        setPosition('left');
      }
    }
  }, [isOpen]);

  const handleEmojiClick = (emoji: string) => {
    onSelect(emoji);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'p-1 rounded-[var(--radius-md)] border-2 border-transparent hover:border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)] transition-all-fast',
          'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
        )}
        title="Add reaction"
      >
        <Smile className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className={cn(
          'absolute top-full mt-1 z-50 bg-[var(--color-bg-secondary)] rounded-[var(--radius-lg)] border-2 border-[var(--color-border-primary)] w-72 animate-scaleIn',
          'shadow-[4px_4px_0px_#0D0D0D]',
          position === 'left' ? 'left-0' : 'right-0'
        )}>
          <div className="flex border-b-2 border-[var(--color-border-primary)]">
            {EMOJI_CATEGORIES.map((category, index) => (
              <button
                key={category.name}
                onClick={() => setActiveCategory(index)}
                className={cn(
                  'flex-1 py-2 px-3 text-xs font-bold transition-colors-fast',
                  activeCategory === index
                    ? 'text-[var(--color-accent-primary)] border-b-2 border-[var(--color-accent-primary)]'
                    : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
          <div className="p-2 max-h-48 overflow-y-auto scrollbar-thin">
            <div className="flex flex-wrap gap-1">
              {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(emoji)}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-[var(--color-bg-hover)] rounded-[var(--radius-md)] transition-colors-fast border-2 border-transparent hover:border-[var(--color-border-primary)]"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
