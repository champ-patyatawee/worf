import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-accent-primary)] focus-visible:ring-offset-[var(--color-bg-primary)]',
          'disabled:pointer-events-none disabled:opacity-40',
          {
            'h-11 px-5 text-[15px] rounded-[var(--radius-md)]': size === 'md',
            'h-9 px-4 text-[13px] rounded-[var(--radius-sm)]': size === 'sm',
            'h-13 px-6 text-base rounded-[var(--radius-lg)]': size === 'lg',
          },
          {
            'btn-brutal bg-[var(--color-accent-primary)] text-white border-2 border-[var(--color-border-primary)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] active:shadow-[var(--shadow-sm)]': variant === 'primary',
            'btn-brutal bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-2 border-[var(--color-border-primary)] shadow-[var(--shadow-sm)]': variant === 'secondary',
            'bg-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] rounded-[var(--radius-md)]': variant === 'ghost',
            'btn-brutal bg-[var(--color-error)] text-white border-2 border-[var(--color-border-primary)] shadow-[var(--shadow-sm)]': variant === 'danger',
            'btn-brutal bg-gradient-to-r from-[#7C5CFF] to-[#F9A8D4] text-white border-2 border-[var(--color-border-primary)] shadow-[var(--shadow-sm)]': variant === 'gradient',
          },
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
