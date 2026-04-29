import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, options, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'flex h-11 w-full rounded-[var(--radius-md)] text-[15px] transition-all duration-150 appearance-none cursor-pointer',
            'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]',
            'border-2',
            error
              ? 'border-[var(--color-error)]'
              : 'border-[var(--color-border-primary)] hover:border-[var(--color-text-secondary)] focus:border-[var(--color-accent-primary)]',
            'px-4 pr-10',
            'focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_#0D0D0D]',
            'disabled:cursor-not-allowed disabled:opacity-40',
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-secondary)] pointer-events-none" />
      </div>
    );
  }
);

Select.displayName = 'Select';
