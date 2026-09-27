import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FormFieldProps = {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optionalLabel?: string;
  className?: string;
  children: (a11y: { id: string; "aria-invalid"?: true; "aria-describedby"?: string }) => ReactNode;
};

/** Label + control + hint + error, wired together for screen readers. */
export function FormField({
  id,
  label,
  hint,
  error,
  optionalLabel,
  className,
  children,
}: FormFieldProps) {
  const describedBy =
    [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") ||
    undefined;
  return (
    <div className={cn("grid gap-1.5", className)} data-invalid={error ? true : undefined}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {optionalLabel ? (
          <span className="ml-1 font-normal text-muted-foreground">({optionalLabel})</span>
        ) : null}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Ids derived from dotted field names ("translations.lo.title" → "f-translations-lo-title"). */
export const fieldId = (name: string) => `f-${name.replace(/\./g, "-")}`;
