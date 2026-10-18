"use client";

import { type FormEvent, startTransition, useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import type { ActionResult } from "@/lib/actions";
import type { AdminMessages } from "@/i18n/admin";

type Labels = Pick<AdminMessages, "common" | "validation">;

/**
 * useActionState + consistent feedback: success/error toasts, field errors
 * resolved to the admin's language, and an onSuccess hook (redirect etc).
 *
 * Forms use `onSubmit`, not `action={formAction}`: React resets a form after
 * every `action` prop run, failed ones included, which would wipe what the
 * editor typed whenever the server rejects it (e.g. a duplicate slug). Forms
 * that should clear after success do so in onSuccess.
 */
export function useActionForm<T>(
  action: (prev: ActionResult<T> | null, formData: FormData) => Promise<ActionResult<T>>,
  labels: Labels,
  /** No successMessage: no toast (the result is visible on screen, e.g. a sent chat message). */
  options: { successMessage?: string; onSuccess?: (data: T | undefined) => void },
) {
  const [state, formAction, pending] = useActionState(action, null);
  const handled = useRef<ActionResult<T> | null>(null);

  useEffect(() => {
    if (!state || handled.current === state) return;
    handled.current = state;
    if (state.ok) {
      if (options.successMessage) toast.success(options.successMessage);
      options.onSuccess?.(state.data);
    } else {
      toast.error(labels.common.errors[state.error]);
      const first = state.fieldErrors ? Object.keys(state.fieldErrors)[0] : undefined;
      if (first) document.querySelector<HTMLElement>(`[name="${CSS.escape(first)}"]`)?.focus();
    }
  }, [state, labels, options]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    // React bubbles events out of portals: a form inside a dialog must not save this one.
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => formAction(formData));
  };

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const errorFor = (name: string) => {
    const key = fieldErrors[name];
    return key
      ? (labels.validation[key as keyof typeof labels.validation] ?? labels.validation.invalid)
      : undefined;
  };

  return { state, onSubmit, pending, fieldErrors, errorFor };
}
