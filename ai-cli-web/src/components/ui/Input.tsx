import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "w-full px-4 py-3 bg-claude-input border border-claude-border rounded-xl",
          "text-claude-text placeholder:text-claude-textSecondary",
          "focus:outline-none focus:ring-2 focus:ring-claude-accent/30 focus:border-claude-accent",
          "transition-all duration-200",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
