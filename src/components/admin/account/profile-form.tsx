"use client";

import { ImageUpIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/admin/form/form-field";
import { useActionForm } from "@/components/admin/form/use-action-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { localeConfig, locales } from "@/config/i18n";
import type { AdminMessages } from "@/i18n/admin";
import { updateOwnProfileAction } from "@/server/actions/users";

type Labels = Pick<AdminMessages, "common" | "validation" | "account">;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

/**
 * The signed-in person's own profile: photo (saved as soon as it's chosen),
 * name and language (saved with the button). Email and role are shown only.
 */
export function ProfileForm({
  profile,
  labels,
}: {
  profile: {
    name: string;
    email: string;
    role: string;
    preferredLocale: string | null;
    avatarUrl: string | null;
  };
  labels: Labels;
}) {
  const router = useRouter();
  const a = labels.account;
  const file = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const { onSubmit, pending, errorFor } = useActionForm(updateOwnProfileAction, labels, {
    successMessage: a.saved,
    onSuccess: () => router.refresh(),
  });

  async function changePhoto(method: "POST" | "DELETE", chosen?: File) {
    setPhotoBusy(true);
    try {
      const body = chosen ? new FormData() : undefined;
      if (chosen) body!.append("file", chosen);
      const res = await fetch("/api/account/avatar", { method, body });
      if (!res.ok) {
        // { error, reason }: reason is a validation key such as fileTooLarge.
        const { reason, error } = (await res.json().catch(() => ({}))) as {
          reason?: string;
          error?: keyof Labels["common"]["errors"];
        };
        const known = reason && reason in labels.validation;
        toast.error(
          known
            ? labels.validation[reason as keyof Labels["validation"]]
            : (labels.common.errors[error ?? "unexpected"] ?? labels.common.errors.unexpected),
        );
        return;
      }
      toast.success(method === "POST" ? a.photoSaved : a.photoRemoved);
      router.refresh();
    } catch {
      toast.error(labels.common.errors.unexpected);
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar className="size-20 text-xl">
          {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt="" /> : null}
          <AvatarFallback className="bg-primary font-semibold text-primary-foreground">
            {initials(profile.name)}
          </AvatarFallback>
        </Avatar>
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={photoBusy}
              onClick={() => file.current?.click()}
            >
              {photoBusy ? <Spinner aria-hidden="true" /> : <ImageUpIcon aria-hidden="true" />}
              {profile.avatarUrl ? a.changePhoto : a.uploadPhoto}
            </Button>
            {profile.avatarUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={photoBusy}
                onClick={() => changePhoto("DELETE")}
              >
                <Trash2Icon aria-hidden="true" />
                {a.removePhoto}
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">{a.photoHint}</p>
          <input
            ref={file}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            tabIndex={-1}
            aria-label={a.uploadPhoto}
            onChange={(e) => {
              const chosen = e.currentTarget.files?.[0];
              e.currentTarget.value = "";
              if (chosen) void changePhoto("POST", chosen);
            }}
          />
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        <FormField id="p-name" label={a.name} error={errorFor("name")}>
          {(f) => (
            <Input
              {...f}
              name="name"
              autoComplete="name"
              defaultValue={profile.name}
              maxLength={120}
            />
          )}
        </FormField>
        <FormField id="p-locale" label={a.language} hint={a.languageHint}>
          {(f) => (
            <NativeSelect
              {...f}
              name="preferredLocale"
              defaultValue={profile.preferredLocale ?? ""}
              className="w-full"
            >
              <NativeSelectOption value="">{a.languageDefault}</NativeSelectOption>
              {locales.map((l) => (
                <NativeSelectOption key={l} value={l}>
                  {localeConfig[l].nativeName}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <dl className="grid gap-3 rounded-md bg-muted/50 p-3 text-sm">
          {(
            [
              [a.email, profile.email],
              [a.role, profile.role],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="grid gap-0.5">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium wrap-anywhere">{value}</dd>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">{a.profileHint}</p>
        </dl>
        <Button type="submit" className="w-fit" disabled={pending}>
          {pending ? <Spinner aria-hidden="true" /> : null}
          {pending ? labels.common.saving : a.save}
        </Button>
      </form>
    </div>
  );
}
