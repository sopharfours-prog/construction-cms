"use client";

import { CircleAlertIcon, MailCheckIcon } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { registerAction, type AuthFormState } from "@/server/actions/auth";

import type { AuthLabels } from "./labels";
import { PasswordInput } from "./password-input";

const initialState: AuthFormState = { status: "idle" };

export function RegisterForm({ labels, formToken }: { labels: AuthLabels; formToken: string }) {
  const [state, formAction, pending] = useActionState(registerAction, initialState);
  const t = labels.register;
  const errors = state.fieldErrors ?? {};

  if (state.status === "success") {
    return (
      <div className="grid gap-6">
        <Alert role="status">
          <MailCheckIcon aria-hidden="true" />
          <AlertTitle>{t.sentTitle}</AlertTitle>
          <AlertDescription>{t.sent}</AlertDescription>
        </Alert>
        <Button asChild variant="outline">
          <Link href="/admin/login">{labels.forgot.backToLogin}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="relative grid gap-6">
      <input type="hidden" name="formToken" value={formToken} />
      {/* Bots fill every field; people never see this one. */}
      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      {state.error ? (
        <Alert variant="destructive" role="alert">
          <CircleAlertIcon aria-hidden="true" />
          <AlertDescription>{labels.errors[state.error]}</AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup>
        <Field data-invalid={errors.name ? true : undefined}>
          <FieldLabel htmlFor="name">{t.name}</FieldLabel>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            defaultValue={state.name}
            maxLength={120}
            required
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "name-error" : undefined}
          />
          {errors.name ? (
            <FieldError id="name-error">{labels.errors[errors.name]}</FieldError>
          ) : null}
        </Field>

        <Field data-invalid={errors.email ? true : undefined}>
          <FieldLabel htmlFor="email">{t.email}</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            defaultValue={state.email}
            maxLength={254}
            required
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email ? (
            <FieldError id="email-error">{labels.errors[errors.email]}</FieldError>
          ) : null}
        </Field>

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

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? <Spinner aria-hidden="true" /> : null}
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
