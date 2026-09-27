"use client";

import { CircleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { loginSchema } from "@/lib/validation/auth";
import { loginAction, type AuthFormState } from "@/server/actions/auth";

import type { AuthLabels } from "./labels";
import { PasswordInput } from "./password-input";
import { useClientValidation } from "./use-client-validation";

const initialState: AuthFormState = { status: "idle" };

export function LoginForm({ labels, callbackUrl }: { labels: AuthLabels; callbackUrl: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const { clientErrors, onSubmit } = useClientValidation(loginSchema, (data) => ({
    email: data.get("email"),
    password: data.get("password"),
    remember: data.get("remember") === "on",
  }));

  const errors = { ...state.fieldErrors, ...clientErrors };
  const t = labels.login;

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="grid gap-6">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      {state.error ? (
        <Alert variant="destructive" role="alert">
          <CircleAlertIcon aria-hidden="true" />
          <AlertDescription>{labels.errors[state.error]}</AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup>
        <Field data-invalid={errors.email ? true : undefined}>
          <FieldLabel htmlFor="email">{t.email}</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            defaultValue={state.email}
            required
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email ? (
            <FieldError id="email-error">{labels.errors[errors.email]}</FieldError>
          ) : null}
        </Field>

        <Field data-invalid={errors.password ? true : undefined}>
          <div className="flex items-baseline justify-between gap-4">
            <FieldLabel htmlFor="password">{t.password}</FieldLabel>
            <Link
              href="/admin/forgot-password"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              {t.forgot}
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            showLabel={t.showPassword}
            hideLabel={t.hidePassword}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "password-error" : undefined}
          />
          {errors.password ? (
            <FieldError id="password-error">{labels.errors[errors.password]}</FieldError>
          ) : null}
        </Field>

        <div className="flex items-center gap-2">
          <Checkbox id="remember" name="remember" />
          <Label htmlFor="remember" className="font-normal">
            {t.remember}
          </Label>
        </div>
      </FieldGroup>

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? <Spinner aria-hidden="true" /> : null}
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
