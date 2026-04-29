import { forwardRef, useState, FormEvent, KeyboardEvent } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';
import { cn } from '@/utils/cn';

interface MessageInputProps {
  onSend: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export const MessageInput = forwardRef<HTMLInputElement, MessageInputProps>(
  ({ onSend, placeholder = 'Type a message...', className }, ref) => {
    const [content, setContent] = useState('');

    const handleSubmit = (e: FormEvent) => {
      e.preventDefault();
      if (content.trim()) {
        onSend(content.trim());
        setContent('');
      }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    };

    return (
      <form
        onSubmit={handleSubmit}
        className={cn('px-4 py-3 border-t bg-[var(--color-bg-primary)]', className)}
        style={{ borderColor: 'var(--color-border-secondary)' }}
      >
        <div
          className="flex items-center gap-2 rounded-[var(--radius-lg)] px-3 py-2 transition-colors duration-100"
          style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)' }}
        >
          <button
            type="button"
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-primary)] hover:bg-[var(--color-bg-hover)] transition-colors duration-75"
            title="Add attachment"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            ref={ref}
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 border-none outline-none text-[15px] bg-transparent text-[var(--color-text-primary)] placeholder:text-[var(--color-text-placeholder)]"
          />
          <button
            type="button"
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-primary)] hover:bg-[var(--color-bg-hover)] transition-colors duration-75"
            title="Add emoji"
          >
            <Smile className="h-4 w-4" />
          </button>
          <button
            type="submit"
            disabled={!content.trim()}
            className={cn(
              'p-1.5 rounded-[var(--radius-full)] transition-all duration-75',
              content.trim()
                ? 'bg-[var(--color-accent-primary)] text-white hover:bg-[var(--color-accent-primary-hover)] active:scale-95'
                : 'text-[var(--color-text-tertiary)] cursor-not-allowed'
            )}
            title="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    );
  }
);

MessageInput.displayName = 'MessageInput';