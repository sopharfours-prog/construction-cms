"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import type { ActionResult } from "@/lib/actions";
import type { AdminMessages } from "@/i18n/admin";

type Labels = Pick<AdminMessages, "common" | "validation">;

/**
 * useActionState + consistent feedback: success/error toasts, field errors
 * resolved to the admin's language, and an onSuccess hook (redirect etc).
 */
export function useActionForm<T>(
  action: (prev: ActionResult<T> | null, formData: FormData) => Promise<ActionResult<T>>,
  labels: Labels,
  options: { successMessage: string; onSuccess?: (data: T | undefined) => void },
) {
  const [state, formAction, pending] = useActionState(action, null);
  const handled = useRef<ActionResult<T> | null>(null);

  useEffect(() => {
    if (!state || handled.current === state) return;
    handled.current = state;
    if (state.ok) {
      toast.success(options.successMessage);
      options.onSuccess?.(state.data);
    } else {
      toast.error(labels.common.errors[state.error]);
      const first = state.fieldErrors ? Object.keys(state.fieldErrors)[0] : undefined;
      if (first) document.querySelector<HTMLElement>(`[name="${CSS.escape(first)}"]`)?.focus();
    }
  }, [state, labels, options]);

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const errorFor = (name: string) => {
    const key = fieldErrors[name];
    return key
      ? (labels.validation[key as keyof typeof labels.validation] ?? labels.validation.invalid)
      : undefined;
  };

  return { state, formAction, pending, fieldErrors, errorFor };
}
