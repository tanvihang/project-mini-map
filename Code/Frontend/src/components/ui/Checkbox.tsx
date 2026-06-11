import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Checkbox({ label, id, className, ...props }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <label
      htmlFor={inputId}
      className="flex cursor-pointer items-center gap-2 font-ui text-ui text-book-text"
    >
      <input
        id={inputId}
        type="checkbox"
        className={cn(
          "h-4 w-4 rounded-sm border-input-border accent-book-cover",
          className,
        )}
        {...props}
      />
      {label}
    </label>
  );
}
