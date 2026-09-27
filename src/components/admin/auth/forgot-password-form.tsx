"use client";

import { MailCheckIcon } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { forgotPasswordAction, type AuthFormState } from "@/server/actions/auth";

import type { AuthLabels } from "./labels";
import { useClientValidation } from "./use-client-validation";

const initialState: AuthFormState = { status: "idle" };

export function ForgotPasswordForm({ labels }: { labels: AuthLabels }) {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialState);
  const { clientErrors, onSubmit } = useClientValidation(forgotPasswordSchema, (data) => ({
    email: data.get("email"),
  }));
  const t = labels.forgot;
  const emailError = clientErrors.email ?? state.fieldErrors?.email;

  if (state.status === "success") {
    return (
      <div className="grid gap-6">
        <Alert role="status">
          <MailCheckIcon aria-hidden="true" />
          <AlertDescription>{t.sent}</AlertDescription>
        </Alert>
        <Button asChild variant="outline">
          <Link href="/admin/login">{t.backToLogin}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="grid gap-6">
      <Field data-invalid={emailError ? true : undefined}>
        <FieldLabel htmlFor="email">{labels.login.email}</FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          defaultValue={state.email}
          required
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? "email-error" : undefined}
        />
        {emailError ? <FieldError id="email-error">{labels.errors[emailError]}</FieldError> : null}
      </Field>
      <div className="grid gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Spinner aria-hidden="true" /> : null}
          {pending ? t.submitting : t.submit}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/admin/login">{t.backToLogin}</Link>
        </Button>
      </div>
    </form>
  );
}
