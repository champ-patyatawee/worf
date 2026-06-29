import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

export function Select({ value, onChange, options, placeholder, className = "" }: SelectProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <button
          className={`w-full rounded-[var(--radius-md)] border-2 px-3 py-2 text-sm font-semibold cursor-pointer outline-none transition-all flex items-center justify-between gap-2 ${className}`}
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            borderColor: "var(--color-border-primary)",
            color: value ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
            boxShadow: "2px 2px 0px var(--color-border-primary)",
          }}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : (placeholder || "Select...")}
          </span>
          <ChevronDown className="h-4 w-4 flex-shrink-0 opacity-60" style={{ color: "var(--color-text-tertiary)" }} />
        </button>
      </PopoverTrigger>
      <PopoverContent sideOffset={5} align="start" className="w-full min-w-[200px] p-1">
        {options.length === 0 ? (
          <div className="px-2 py-3 text-xs text-center" style={{ color: "var(--color-text-tertiary)" }}>
            No options
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className="flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-[var(--radius-md)] cursor-pointer transition-colors"
                style={{
                  backgroundColor: option.value === value ? "var(--color-bg-hover)" : "transparent",
                  color: "var(--color-text-primary)",
                  fontWeight: option.value === value ? 700 : 500,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--color-bg-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = option.value === value ? "var(--color-bg-hover)" : "transparent"; }}
              >
                <span>{option.label}</span>
                {option.value === value && (
                  <Check className="w-3 h-3" style={{ color: "var(--color-accent-primary)" }} />
                )}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
