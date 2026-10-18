"use client";

import { useRouter } from "next/navigation";

import { FormField } from "@/components/admin/form/form-field";
import { useActionForm } from "@/components/admin/form/use-action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { AdminMessages } from "@/i18n/admin";
import { changeOwnPasswordAction } from "@/server/actions/users";

type Labels = Pick<AdminMessages, "common" | "validation" | "account">;

/** Changing the password ends every session, so success leads to the sign-in page. */
export function ChangePasswordForm({ email, labels }: { email: string; labels: Labels }) {
  const router = useRouter();
  const a = labels.account;
  const { onSubmit, pending, errorFor } = useActionForm(changeOwnPasswordAction, labels, {
    successMessage: a.changed,
    onSuccess: () => router.push("/admin/login"),
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {/* Lets password managers attach the new password to the right account. */}
      <input type="hidden" name="username" autoComplete="username" value={email} readOnly />
      <FormField id="a-current" label={a.currentPassword} error={errorFor("currentPassword")}>
        {(f) => (
          <Input
            {...f}
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            maxLength={128}
          />
        )}
      </FormField>
      <FormField id="a-new" label={a.newPassword} hint={a.hint} error={errorFor("password")}>
        {(f) => (
          <Input
            {...f}
            name="password"
            type="password"
            autoComplete="new-password"
            maxLength={128}
          />
        )}
      </FormField>
      <FormField id="a-confirm" label={a.confirmPassword} error={errorFor("confirmPassword")}>
        {(f) => (
          <Input
            {...f}
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            maxLength={128}
          />
        )}
      </FormField>
      <p className="text-xs text-muted-foreground">{a.signOutHint}</p>
      <Button type="submit" className="w-fit" disabled={pending}>
        {pending ? <Spinner aria-hidden="true" /> : null}
        {pending ? labels.common.saving : a.submit}
      </Button>
    </form>
  );
}
