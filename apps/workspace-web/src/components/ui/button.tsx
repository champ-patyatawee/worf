import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-accent-primary)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-accent-primary)] text-white border-2 border-[var(--color-border-primary)] rounded-[var(--radius-md)] shadow-[2px_2px_0px_#0D0D0D] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#0D0D0D] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        destructive:
          "bg-[var(--color-error)] text-white border-2 border-[var(--color-border-primary)] rounded-[var(--radius-md)] shadow-[2px_2px_0px_#0D0D0D] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#0D0D0D] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        outline:
          "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border-2 border-[var(--color-border-primary)] rounded-[var(--radius-md)] shadow-[2px_2px_0px_#0D0D0D] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#0D0D0D] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        secondary:
          "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border-2 border-[var(--color-border-primary)] rounded-[var(--radius-md)] shadow-[2px_2px_0px_#0D0D0D] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#0D0D0D] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        ghost:
          "hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] rounded-[var(--radius-md)]",
        link:
          "text-[var(--color-accent-primary)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-[var(--radius-md)] px-3 text-xs",
        lg: "h-10 rounded-[var(--radius-md)] px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
