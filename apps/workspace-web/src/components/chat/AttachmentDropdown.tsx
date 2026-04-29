import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Image, Link2, Plus, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { URLInput } from './URLInput';

interface AttachmentDropdownProps {
  onImageSelect: () => void;
  onLinkSubmit: (url: string) => void;
  className?: string;
}

export const AttachmentDropdown = memo(function AttachmentDropdown({
  onImageSelect,
  onLinkSubmit,
  className,
}: AttachmentDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowLinkInput(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setShowLinkInput(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleImageClick = useCallback(() => {
    onImageSelect();
    setIsOpen(false);
  }, [onImageSelect]);

  const handleLinkClick = useCallback(() => {
    setShowLinkInput(true);
  }, []);

  const handleLinkSubmit = useCallback((url: string) => {
    onLinkSubmit(url);
    setIsOpen(false);
    setShowLinkInput(false);
  }, [onLinkSubmit, isOpen]);

  const handleLinkCancel = useCallback(() => {
    setShowLinkInput(false);
  }, []);

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'inline-flex items-center justify-center relative isolate shrink-0 select-none',
          'border-2 border-transparent transition-all duration-300',
          'h-8 w-8 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-border-primary)] active:scale-100',
          'disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none',
          isOpen && 'bg-[var(--color-bg-hover)] border-[var(--color-border-primary)]'
        )}
        aria-label="Add files, connectors, and more"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <div className="w-5 h-5 flex items-center justify-center">
          {isOpen ? (
            <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
          ) : (
            <Plus className="w-5 h-5 text-[var(--color-text-secondary)]" />
          )}
        </div>
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute bottom-full left-0 mb-2 z-50',
            'min-w-[12rem] w-max',
            'bg-[var(--color-bg-secondary)] rounded-[var(--radius-lg)] border-2 border-[var(--color-border-primary)]',
            'shadow-[4px_4px_0px_#0D0D0D]',
            'p-1.5 overflow-hidden'
          )}
          role="menu"
          aria-label="Attachment options"
        >
          {showLinkInput ? (
            <div className="p-1">
              <URLInput
                onSubmit={handleLinkSubmit}
                onCancel={handleLinkCancel}
                placeholder="Paste link URL..."
                autoFocus
              />
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={handleImageClick}
                className={cn(
                  'relative flex items-center justify-between text-sm min-h-8 px-2 py-1.5 gap-4',
                  'group select-none rounded-[var(--radius-md)] cursor-pointer',
                  'hover:bg-[var(--color-bg-hover)] active:bg-[var(--color-bg-active)]'
                )}
                role="menuitem"
              >
                <div className="flex gap-2 min-w-0 items-center">
                  <div className="size-5 flex items-center justify-center shrink-0">
                    <Image className="w-5 h-5 text-[var(--color-text-secondary)]" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="truncate font-medium text-[var(--color-text-primary)]">Add files or photos</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleLinkClick}
                className={cn(
                  'relative flex items-center justify-between text-sm min-h-8 px-2 py-1.5 gap-4',
                  'group select-none rounded-[var(--radius-md)] cursor-pointer',
                  'hover:bg-[var(--color-bg-hover)] active:bg-[var(--color-bg-active)]'
                )}
                role="menuitem"
              >
                <div className="flex gap-2 min-w-0 items-center">
                  <div className="size-5 flex items-center justify-center shrink-0">
                    <Link2 className="w-5 h-5 text-[var(--color-text-secondary)]" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="truncate font-medium text-[var(--color-text-primary)]">Add link</div>
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
