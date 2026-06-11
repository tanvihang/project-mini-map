import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  isLoading?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-btn-primary text-btn-primary-text shadow-card hover:opacity-90",
  secondary:
    "border border-input-border bg-input-bg text-panel-text hover:bg-panel-bg",
  ghost: "text-book-text-muted hover:text-book-text",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      fullWidth = false,
      isLoading = false,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 font-ui text-ui font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-input-focus disabled:cursor-not-allowed disabled:opacity-60",
          VARIANTS[variant],
          fullWidth && "w-full",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
