import * as React from "react";
import { cn } from "@/utils/cn";

const Separator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    orientation?: "horizontal" | "vertical";
  }
>(({ className, orientation = "horizontal", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "shrink-0",
      orientation === "horizontal" ? "h-[2px] w-full" : "h-full w-[2px]",
      className
    )}
    style={{ backgroundColor: 'var(--color-border-primary)', opacity: 0.15 }}
    {...props}
  />
));
Separator.displayName = "Separator";

export { Separator };
