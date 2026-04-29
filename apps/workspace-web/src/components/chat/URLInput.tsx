import { useState, useCallback, useRef, useEffect, forwardRef } from 'react';
import { Link2, Send, X, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface URLInputProps {
  onSubmit: (url: string) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export const URLInput = forwardRef<HTMLInputElement, URLInputProps>(
  ({ onSubmit, onCancel, isLoading = false, placeholder = 'Paste link URL...', className, autoFocus = true }, ref) => {
    const [url, setUrl] = useState('');
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const actualRef = ref || inputRef;

    useEffect(() => {
      if (autoFocus && actualRef && 'current' in actualRef && actualRef.current) {
        actualRef.current.focus();
      }
    }, [actualRef, autoFocus]);

    const validateURL = useCallback((urlString: string): boolean => {
      if (!urlString.trim()) {
        setError('Please enter a URL');
        return false;
      }

      try {
        const urlObj = new URL(urlString);
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
          setError('URL must start with http:// or https://');
          return false;
        }
        setError(null);
        return true;
      } catch {
        setError('Please enter a valid URL');
        return false;
      }
    }, []);

    const handleSubmit = useCallback(
      (e: React.FormEvent) => {
        e.preventDefault();
        if (validateURL(url)) {
          onSubmit(url.trim());
          setUrl('');
          setError(null);
        }
      },
      [url, validateURL, onSubmit]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSubmit(e);
        } else if (e.key === 'Escape' && onCancel) {
          onCancel();
        }
      },
      [handleSubmit, onCancel]
    );

    const handleClear = useCallback(() => {
      setUrl('');
      setError(null);
      inputRef.current?.focus();
    }, []);

    return (
      <form
        onSubmit={handleSubmit}
        className={cn('flex items-center gap-2', className)}
      >
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
            <Link2 className="w-4 h-4" />
          </div>
          <input
            ref={actualRef}
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) validateURL(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className={cn(
              'w-full h-10 pl-10 pr-10 border-2 rounded-[var(--radius-md)]',
              'text-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]',
              'focus:outline-none focus:border-[var(--color-accent-primary)] focus:shadow-[2px_2px_0px_#0D0D0D]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-status-error focus:border-status-error'
            )}
            style={{ borderColor: error ? undefined : 'var(--color-border-primary)' }}
          />
          {url && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={!url.trim() || isLoading}
          className={cn(
            'h-10 px-4 rounded-[var(--radius-md)] font-semibold transition-all flex items-center gap-2 border-2',
            url.trim() && !isLoading
              ? 'bg-[var(--color-accent-primary)] text-white border-[var(--color-border-primary)] shadow-[2px_2px_0px_#0D0D0D] hover:shadow-[4px_4px_0px_#0D0D0D]'
              : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] border-transparent cursor-not-allowed'
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">Sending...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </>
          )}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-3 rounded-[var(--radius-md)] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-border-primary)] border-2 border-transparent transition-all"
          >
            Cancel
          </button>
        )}

        {error && (
          <p className="absolute -bottom-5 left-0 text-xs text-status-error font-medium">{error}</p>
        )}
      </form>
    );
  }
);

URLInput.displayName = 'URLInput';
