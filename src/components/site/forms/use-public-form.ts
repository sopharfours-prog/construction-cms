"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { z } from "zod";

import type { Locale } from "@/config/i18n";
import type { Messages } from "@/i18n/messages";

type Errors = Messages["public"]["form"]["errors"];
type ErrorKey = keyof Errors;
export type Status =
  | { state: "idle" | "sending" }
  | { state: "success"; reference?: string }
  | { state: "error"; message: string };

const ACCEPTED = /\.(pdf|jpe?g|png|docx)$/i;
const MAX_FILE = 10 * 1024 * 1024;

/**
 * Public form submission: client validation with the server's Zod schema,
 * files checked for count/type/size, fresh anti-spam token, multipart POST,
 * and server errors mapped back to fields.
 */
export function usePublicForm(options: {
  endpoint: string;
  schema: z.ZodType;
  locale: Locale;
  errors: Errors;
  maxFiles: number;
}) {
  const { endpoint, schema, locale, errors, maxFiles } = options;
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const token = useRef<string | null>(null);

  const loadToken = useCallback(async () => {
    try {
      const res = await fetch("/api/form-token", { cache: "no-store" });
      token.current = res.ok ? ((await res.json()) as { token: string }).token : null;
    } catch {
      token.current = null;
    }
  }, []);

  useEffect(() => {
    void loadToken();
  }, [loadToken]);

  const message = (key: string | undefined) =>
    key && key in errors ? errors[key as ErrorKey] : errors.invalid;

  const focusFirst = (form: HTMLFormElement, names: string[]) => {
    const first = names
      .map((n) => form.elements.namedItem(n))
      .find((el): el is HTMLElement => el instanceof HTMLElement);
    first?.focus();
  };

  const addFiles = (list: FileList | null) => {
    const next = [...files, ...Array.from(list ?? [])];
    setFiles(next);
    const problem =
      next.length > maxFiles
        ? "tooManyFiles"
        : next.find((f) => !ACCEPTED.test(f.name))
          ? "fileType"
          : next.find((f) => f.size > MAX_FILE)
            ? "fileTooLarge"
            : null;
    setFieldErrors((e) => {
      const { attachments: _removed, ...rest } = e;
      return problem ? { ...rest, attachments: errors[problem] } : rest;
    });
  };
  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, i) => i !== index));
    setFieldErrors(({ attachments: _removed, ...rest }) => rest);
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    data.delete("attachments");
    const fields = Object.fromEntries([...data.entries()].filter(([, v]) => typeof v === "string"));

    const parsed = schema.safeParse(fields);
    const nextErrors: Record<string, string> = {};
    if (!parsed.success)
      for (const issue of parsed.error.issues)
        nextErrors[issue.path.join(".")] ??= message(issue.message);
    if (files.length > maxFiles) nextErrors.attachments = errors.tooManyFiles;
    else if (files.some((f) => !ACCEPTED.test(f.name))) nextErrors.attachments = errors.fileType;
    else if (files.some((f) => f.size > MAX_FILE)) nextErrors.attachments = errors.fileTooLarge;
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setStatus({ state: "idle" });
      focusFirst(form, Object.keys(nextErrors));
      return;
    }

    setStatus({ state: "sending" });
    if (!token.current) await loadToken();
    data.set("formToken", token.current ?? "");
    data.set("locale", locale);
    for (const file of files) data.append("attachments", file);

    try {
      const res = await fetch(endpoint, { method: "POST", body: data });
      const body = (await res.json().catch(() => null)) as {
        reference?: string;
        reason?: string;
        error?: string;
        issues?: Record<string, string>;
      } | null;
      if (res.ok) {
        setStatus({ state: "success", reference: body?.reference });
        setFiles([]);
        form.reset();
        void loadToken();
        return;
      }
      if (body?.issues) {
        const mapped = Object.fromEntries(
          Object.entries(body.issues).map(([k, v]) => [k, message(v)]),
        );
        setFieldErrors(mapped);
        focusFirst(form, Object.keys(mapped));
      }
      if (body?.reason === "formExpired") void loadToken();
      const key =
        body?.reason && body.reason in errors
          ? (body.reason as ErrorKey)
          : body?.error === "rateLimited"
            ? "rateLimited"
            : body?.issues
              ? null
              : "unexpected";
      setStatus({ state: "error", message: key ? errors[key] : "" });
    } catch {
      setStatus({ state: "error", message: errors.unexpected });
    }
  };

  const reset = () => {
    setStatus({ state: "idle" });
    setFieldErrors({});
  };

  return { status, fieldErrors, files, addFiles, removeFile, onSubmit, reset };
}
