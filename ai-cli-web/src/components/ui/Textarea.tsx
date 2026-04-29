import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full px-4 py-3 bg-claude-bg border border-claude-border rounded-3xl",
          "text-claude-text placeholder:text-claude-textSecondary",
          "focus:outline-none focus:ring-2 focus:ring-claude-accent/30 focus:border-claude-accent",
          "transition-all duration-200 resize-none",
          "min-h-[52px] max-h-[200px]",
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
