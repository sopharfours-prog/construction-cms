"use client";

import { useState, type FormEvent } from "react";
import type { ZodType } from "zod";

import type { AuthErrorKey } from "@/lib/validation/auth";

type Field = "email" | "password" | "confirmPassword";
export type FieldErrors = Partial<Record<Field, AuthErrorKey>>;

/**
 * Validates with the same Zod schema the server action uses, before the form
 * is submitted. The server still re-validates everything: this is for fast
 * feedback, never for security.
 */
export function useClientValidation(schema: ZodType, toInput: (data: FormData) => unknown) {
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const result = schema.safeParse(toInput(new FormData(event.currentTarget)));
    if (result.success) {
      setClientErrors({});
      return;
    }
    event.preventDefault();
    const errors: FieldErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as Field;
      if (field && !errors[field]) errors[field] = issue.message as AuthErrorKey;
    }
    setClientErrors(errors);
    const first = Object.keys(errors)[0];
    if (first) event.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }

  return { clientErrors, setClientErrors, onSubmit };
}
