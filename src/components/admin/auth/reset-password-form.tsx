"use client";

import { CircleAlertIcon, CircleCheckIcon } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { resetPasswordAction, type AuthFormState } from "@/server/actions/auth";

import type { AuthLabels } from "./labels";
import { PasswordInput } from "./password-input";
import { useClientValidation } from "./use-client-validation";

const initialState: AuthFormState = { status: "idle" };

export function ResetPasswordForm({ labels, token }: { labels: AuthLabels; token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);
  const { clientErrors, onSubmit } = useClientValidation(resetPasswordSchema, (data) => ({
    token: data.get("token"),
    password: data.get("password"),
    confirmPassword: data.get("confirmPassword"),
  }));
  const t = labels.reset;
  const errors = { ...state.fieldErrors, ...clientErrors };

  if (state.status === "success") {
    return (
      <div className="grid gap-6">
        <Alert role="status">
          <CircleCheckIcon aria-hidden="true" />
          <AlertDescription>{t.success}</AlertDescription>
        </Alert>
        <Button asChild size="lg">
          <Link href="/admin/login">{t.signIn}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="grid gap-6">
      <input type="hidden" name="token" value={token} />

      {state.error ? (
        <Alert variant="destructive" role="alert">
          <CircleAlertIcon aria-hidden="true" />
          <AlertDescription>
            {labels.errors[state.error]}{" "}
            <Link
              href="/admin/forgot-password"
              className="font-medium underline underline-offset-4"
            >
              {t.requestNew}
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup>
        <Field data-invalid={errors.password ? true : undefined}>
          <FieldLabel htmlFor="password">{t.password}</FieldLabel>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={12}
            showLabel={labels.login.showPassword}
            hideLabel={labels.login.hidePassword}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "password-error password-hint" : "password-hint"}
          />
          <FieldDescription id="password-hint">{t.hint}</FieldDescription>
          {errors.password ? (
            <FieldError id="password-error">{labels.errors[errors.password]}</FieldError>
          ) : null}
        </Field>
        <Field data-invalid={errors.confirmPassword ? true : undefined}>
          <FieldLabel htmlFor="confirmPassword">{t.confirmPassword}</FieldLabel>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            required
            showLabel={labels.login.showPassword}
            hideLabel={labels.login.hidePassword}
            aria-invalid={errors.confirmPassword ? true : undefined}
            aria-describedby={errors.confirmPassword ? "confirm-error" : undefined}
          />
          {errors.confirmPassword ? (
            <FieldError id="confirm-error">{labels.errors[errors.confirmPassword]}</FieldError>
          ) : null}
        </Field>
      </FieldGroup>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? <Spinner aria-hidden="true" /> : null}
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
