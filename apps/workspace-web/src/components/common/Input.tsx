import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-[var(--radius-md)] text-[15px] transition-all duration-150',
          'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]',
          'placeholder:text-[var(--color-text-placeholder)]',
          'border-2',
          error
            ? 'border-[var(--color-error)]'
            : 'border-[var(--color-border-primary)] hover:border-[var(--color-text-secondary)] focus:border-[var(--color-accent-primary)]',
          'px-4 py-3 h-11',
          'focus:outline-none focus:ring-0',
          'focus:shadow-[4px_4px_0px_#0D0D0D]',
          'disabled:cursor-not-allowed disabled:opacity-40',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
