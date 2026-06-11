import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/utils/cn";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Element rendered inside the field on the left (e.g. a mail icon). */
  leading?: ReactNode;
  /** Element rendered inside the field on the right (e.g. a password toggle). */
  trailing?: ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, leading, trailing, id, className, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block font-ui text-small font-medium text-book-text"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leading && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-book-text-muted">
              {leading}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            aria-invalid={error ? true : undefined}
            className={cn(
              "w-full rounded-sm border bg-input-bg px-4 py-3 font-ui text-ui text-book-text outline-none transition placeholder:text-book-text-muted/70 focus:ring-2 focus:ring-input-focus/30",
              error ? "border-error focus:border-error" : "border-input-border focus:border-input-focus",
              leading && "pl-11",
              trailing && "pr-11",
              className,
            )}
            {...props}
          />
          {trailing && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {trailing}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 font-ui text-ui-sm text-error">{error}</p>
        )}
      </div>
    );
  },
);

TextField.displayName = "TextField";
