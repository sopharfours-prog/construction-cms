"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/admin/form/form-field";
import { FormActions, FormSection } from "@/components/admin/form/form-section";
import { useActionForm } from "@/components/admin/form/use-action-form";
import { MediaField } from "@/components/admin/media/media-field";
import type { PickedImage } from "@/components/admin/media/media-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import type { AdminMessages } from "@/i18n/admin";
import type { ActionResult } from "@/lib/actions";

export type UserFormValues = {
  name: string;
  email: string;
  roleId: string;
  status: "ACTIVE" | "DISABLED" | "PENDING";
  preferredLocale: string;
  avatar: PickedImage | null;
};
type Result = { id: string; linkSent?: boolean; needsLink?: boolean };

type Props = {
  action: (prev: ActionResult<Result> | null, fd: FormData) => Promise<ActionResult<Result>>;
  initial?: UserFormValues;
  roles: { id: string; name: string }[];
  isSelf?: boolean;
  labels: Pick<AdminMessages, "common" | "validation" | "users" | "media">;
};

export function UserForm({ action, initial, roles, isSelf = false, labels }: Props) {
  const router = useRouter();
  const isNew = !initial;
  const u = labels.users;
  const c = labels.common;
  const [mode, setMode] = useState<"email" | "set">("email");
  const { onSubmit, pending, errorFor } = useActionForm(action, labels, {
    successMessage: isNew ? u.created : c.toast.saved,
    onSuccess: (data) => {
      if (isNew && data) {
        if (data.needsLink)
          (data.linkSent ? toast.success : toast.warning)(
            data.linkSent ? u.createdLinkSent : u.createdLinkFailed,
          );
        router.push(`/admin/users/${data.id}` as Route);
      } else router.refresh();
    },
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FormSection title={u.sections.profile}>
          <FormField id="u-name" label={u.fields.name} error={errorFor("name")}>
            {(a) => (
              <Input
                {...a}
                name="name"
                defaultValue={initial?.name}
                autoComplete="off"
                maxLength={120}
              />
            )}
          </FormField>
          <FormField id="u-email" label={u.fields.email} error={errorFor("email")}>
            {(a) => (
              <Input
                {...a}
                name="email"
                type="email"
                defaultValue={initial?.email}
                autoComplete="off"
                maxLength={254}
              />
            )}
          </FormField>
          <FormField id="u-locale" label={u.fields.language}>
            {(a) => (
              <NativeSelect
                {...a}
                name="preferredLocale"
                defaultValue={initial?.preferredLocale ?? ""}
                className="w-full"
              >
                <NativeSelectOption value="">{u.fields.languageDefault}</NativeSelectOption>
                <NativeSelectOption value="lo">ພາສາລາວ</NativeSelectOption>
                <NativeSelectOption value="en">English</NativeSelectOption>
              </NativeSelect>
            )}
          </FormField>
          <MediaField
            name="avatarId"
            label={u.fields.avatar}
            error={errorFor("avatarId")}
            defaultValue={initial?.avatar ?? null}
            labels={labels}
          />
        </FormSection>

        <div className="grid content-start gap-6">
          <FormSection title={u.sections.access}>
            {isSelf ? (
              <>
                <input type="hidden" name="roleId" value={initial?.roleId} />
                <input type="hidden" name="status" value="ACTIVE" />
                <p className="text-sm text-muted-foreground">{u.ownAccountHint}</p>
              </>
            ) : (
              <>
                <FormField
                  id="u-role"
                  label={u.fields.role}
                  hint={u.roleHint}
                  error={errorFor("roleId")}
                >
                  {(a) => (
                    <NativeSelect
                      {...a}
                      name="roleId"
                      // A registration request has no real role yet: one must be chosen.
                      defaultValue={initial?.status === "PENDING" ? "" : (initial?.roleId ?? "")}
                      className="w-full"
                    >
                      <NativeSelectOption value="" disabled>
                        —
                      </NativeSelectOption>
                      {roles.map((r) => (
                        <NativeSelectOption key={r.id} value={r.id}>
                          {r.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  )}
                </FormField>
                <FormField id="u-status" label={u.fields.status} error={errorFor("status")}>
                  {(a) => (
                    <NativeSelect
                      {...a}
                      name="status"
                      defaultValue={initial?.status ?? "ACTIVE"}
                      className="w-full"
                    >
                      {initial?.status === "PENDING" ? (
                        <NativeSelectOption value="PENDING">{u.status.PENDING}</NativeSelectOption>
                      ) : null}
                      <NativeSelectOption value="ACTIVE">{u.status.ACTIVE}</NativeSelectOption>
                      <NativeSelectOption value="DISABLED">{u.status.DISABLED}</NativeSelectOption>
                    </NativeSelect>
                  )}
                </FormField>
              </>
            )}
          </FormSection>

          {isNew ? (
            <FormSection title={u.sections.password}>
              <fieldset className="grid gap-2">
                <legend className="mb-1 text-sm font-medium">{u.fields.passwordMode}</legend>
                {(["email", "set"] as const).map((m) => (
                  <label key={m} className="flex min-h-8 items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="passwordMode"
                      value={m}
                      checked={mode === m}
                      onChange={() => setMode(m)}
                      className="size-4 accent-primary"
                    />
                    {m === "email" ? u.fields.modeEmail : u.fields.modeSet}
                  </label>
                ))}
              </fieldset>
              {mode === "set" ? (
                <FormField
                  id="u-password"
                  label={u.fields.password}
                  hint={u.fields.passwordHint}
                  error={errorFor("password")}
                >
                  {(a) => (
                    <Input
                      {...a}
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      maxLength={128}
                    />
                  )}
                </FormField>
              ) : null}
            </FormSection>
          ) : null}
        </div>
      </div>
      <FormActions>
        <Button asChild variant="ghost">
          <Link href="/admin/users">{c.cancel}</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner aria-hidden="true" /> : null}
          {pending ? c.saving : isNew ? c.create : c.save}
        </Button>
      </FormActions>
    </form>
  );
}
