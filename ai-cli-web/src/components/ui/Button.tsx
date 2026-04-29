import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "icon";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
      primary:
        "bg-claude-accent text-white hover:bg-claude-accentHover hover:shadow-claude-hover active:scale-[0.98]",
      secondary:
        "bg-claude-sidebar text-claude-text hover:bg-claude-border active:scale-[0.98]",
      ghost:
        "bg-transparent text-claude-textSecondary hover:bg-claude-sidebar hover:text-claude-text",
      icon: "bg-transparent text-claude-textSecondary hover:bg-claude-sidebar hover:text-claude-text rounded-full",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm rounded-lg",
      md: "px-4 py-2 text-sm rounded-xl",
      lg: "px-6 py-3 text-base rounded-xl",
    };

    const iconSizes = {
      sm: "p-1.5",
      md: "p-2",
      lg: "p-2.5",
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          variant === "icon" ? iconSizes[size] : sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
