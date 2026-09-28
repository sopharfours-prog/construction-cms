"use client";

import { FileIcon, PaperclipIcon, XIcon } from "lucide-react";
import { useRef } from "react";

import { fmt } from "@/i18n/format";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-md border bg-background px-3 py-2.5 text-base outline-none transition focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/40 aria-[invalid=true]:border-destructive md:text-sm";

type Base = {
  name: string;
  label: string;
  error?: string;
  required?: boolean;
  optionalLabel?: string;
  hint?: string;
  className?: string;
};

function Wrapper({
  name,
  label,
  error,
  required,
  optionalLabel,
  hint,
  className,
  children,
}: Base & { children: React.ReactNode }) {
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <label htmlFor={`pf-${name}`} className="text-sm font-medium">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-destructive">
            *
          </span>
        ) : optionalLabel ? (
          <span className="ml-1 font-normal text-muted-foreground">({optionalLabel})</span>
        ) : null}
      </label>
      {children}
      {hint ? (
        <p id={`pf-${name}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`pf-${name}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (name: string, error?: string, hint?: string) =>
  [hint ? `pf-${name}-hint` : null, error ? `pf-${name}-error` : null].filter(Boolean).join(" ") ||
  undefined;

export function TextField(props: Base & React.InputHTMLAttributes<HTMLInputElement>) {
  const { name, label, error, required, optionalLabel, hint, className, ...input } = props;
  return (
    <Wrapper {...{ name, label, error, required, optionalLabel, hint, className }}>
      <input
        id={`pf-${name}`}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        className={control}
        {...input}
      />
    </Wrapper>
  );
}

export function TextAreaField(props: Base & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { name, label, error, required, optionalLabel, hint, className, ...input } = props;
  return (
    <Wrapper {...{ name, label, error, required, optionalLabel, hint, className }}>
      <textarea
        id={`pf-${name}`}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        className={cn(control, "min-h-36")}
        {...input}
      />
    </Wrapper>
  );
}

export function SelectField(
  props: Base & { options: { value: string; label: string }[]; defaultValue?: string },
) {
  const { name, label, error, required, optionalLabel, hint, className, options, defaultValue } =
    props;
  return (
    <Wrapper {...{ name, label, error, required, optionalLabel, hint, className }}>
      <select
        id={`pf-${name}`}
        name={name}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        className={cn(control, "h-11")}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrapper>
  );
}

/** Bots fill every field; people never see this one. */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

export function AttachmentField({
  files,
  onAdd,
  onRemove,
  error,
  labels,
  maxFiles,
}: {
  files: File[];
  onAdd: (files: FileList | null) => void;
  onRemove: (index: number) => void;
  error?: string;
  labels: { attachments: string; attachmentsHint: string; remove: string; optional: string };
  maxFiles: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium">
        {labels.attachments}{" "}
        <span className="font-normal text-muted-foreground">({labels.optional})</span>
      </p>
      <input
        ref={input}
        id="pf-attachments"
        name="attachments"
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.docx,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        aria-invalid={error ? true : undefined}
        aria-describedby={`pf-attachments-hint${error ? " pf-attachments-error" : ""}`}
        className="sr-only"
        onChange={(e) => {
          onAdd(e.currentTarget.files);
          e.currentTarget.value = "";
        }}
      />
      <label
        htmlFor="pf-attachments"
        className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm font-medium hover:border-primary has-[:focus-visible]:ring-2"
      >
        <PaperclipIcon className="size-4" aria-hidden="true" />
        {labels.attachments}
      </label>
      <p id="pf-attachments-hint" className="text-xs text-muted-foreground">
        {fmt(labels.attachmentsHint, { count: maxFiles })}
      </p>
      {files.length ? (
        <ul className="grid gap-1.5">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm"
            >
              <FileIcon className="size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="rounded p-1 hover:bg-background"
                aria-label={fmt(labels.remove, { name: file.name })}
              >
                <XIcon className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p id="pf-attachments-error" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
