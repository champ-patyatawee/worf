import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={cn(
          'relative z-10 w-full max-w-md rounded-[var(--radius-xl)] border-2 border-[var(--color-border-primary)] animate-scaleIn overflow-hidden max-h-[90vh] flex flex-col',
          'bg-[var(--color-bg-secondary)]',
          className
        )}
        style={{
          boxShadow: '8px 8px 0px #0D0D0D',
        }}
      >
        {title && (
          <div
            className="flex items-center justify-between p-5 flex-shrink-0 border-b-2 border-[var(--color-border-primary)] bg-[var(--color-bg-tertiary)]"
          >
            <h2 className="text-[18px] font-extrabold text-[var(--color-text-primary)]">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-[var(--radius-sm)] transition-colors border-2 border-transparent hover:border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)]"
            >
              <X className="h-5 w-5 text-[var(--color-text-secondary)]" />
            </button>
          </div>
        )}
        <div className={cn('overflow-y-auto flex-1 min-h-0 p-5', !title && 'pt-5')}>
          {children}
        </div>
      </div>
    </div>
  );
}
