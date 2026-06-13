import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-md)] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent-primary)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-accent-primary)] text-white shadow hover:bg-[var(--color-accent-primary-hover)]",
        destructive: "bg-[var(--color-error)] text-white shadow-sm hover:bg-red-500",
        outline: "border-2 border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] shadow-sm hover:bg-[var(--color-bg-hover)]",
        secondary: "bg-[var(--color-bg-secondary)] border-2 border-[var(--color-border-primary)] shadow-sm hover:bg-[var(--color-bg-hover)]",
        ghost: "hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]",
        link: "text-[var(--color-accent-primary)] underline-offset-4 hover:underline",
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
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
