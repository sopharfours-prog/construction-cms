"use client";

import { KeyRoundIcon, MailIcon, PowerIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/admin/form/form-field";
import { useActionForm } from "@/components/admin/form/use-action-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminMessages } from "@/i18n/admin";
import type { ActionResult } from "@/lib/actions";
import {
  deleteUserAction,
  sendUserPasswordLinkAction,
  setUserPasswordAction,
  setUserStatusAction,
} from "@/server/actions/users";

type Labels = Pick<AdminMessages, "common" | "validation" | "users">;

/** Reset link, new password, enable/disable and delete for one user. */
export function UserSecurity({
  userId,
  userName,
  status,
  can,
  labels,
}: {
  userId: string;
  userName: string;
  status: "ACTIVE" | "DISABLED";
  can: { update: boolean; delete: boolean };
  labels: Labels;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const u = labels.users;
  const c = labels.common;
  const password = useActionForm(setUserPasswordAction.bind(null, userId), labels, {
    successMessage: u.passwordSet,
    onSuccess: () => form.current?.reset(),
  });

  const run = (action: () => Promise<ActionResult<unknown>>, success: string, after?: () => void) =>
    start(async () => {
      const r = await action();
      if (r.ok) {
        toast.success(success);
        if (after) after();
        else router.refresh();
      } else {
        const key = r.fieldErrors ? Object.values(r.fieldErrors)[0] : undefined;
        toast.error(
          (key && labels.validation[key as keyof typeof labels.validation]) || c.errors[r.error],
        );
      }
    });

  return (
    <div className="grid gap-6">
      {can.update ? (
        <>
          <div className="grid gap-2">
            <Button
              variant="outline"
              className="w-fit"
              disabled={pending || status !== "ACTIVE"}
              onClick={() => run(() => sendUserPasswordLinkAction(userId), u.linkSent)}
            >
              <MailIcon aria-hidden="true" />
              {u.sendLink}
            </Button>
            <p className="text-xs text-muted-foreground">{u.sendLinkHint}</p>
          </div>
          <form
            ref={form}
            action={password.formAction}
            noValidate
            className="grid gap-3 border-t pt-5"
          >
            <p className="flex items-center gap-2 text-sm font-medium">
              <KeyRoundIcon className="size-4" aria-hidden="true" />
              {u.setPassword}
            </p>
            <FormField
              id="s-password"
              label={u.fields.password}
              hint={`${u.fields.passwordHint} ${u.setPasswordHint}`}
              error={password.errorFor("password")}
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
            <FormField
              id="s-confirm"
              label={u.fields.confirmPassword}
              error={password.errorFor("confirmPassword")}
            >
              {(a) => (
                <Input
                  {...a}
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  maxLength={128}
                />
              )}
            </FormField>
            <Button type="submit" variant="secondary" className="w-fit" disabled={password.pending}>
              {password.pending ? c.saving : u.setPassword}
            </Button>
          </form>
        </>
      ) : null}
      <div className="flex flex-wrap gap-2 border-t pt-5">
        {can.update ? (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              run(
                () => setUserStatusAction(userId, status === "ACTIVE" ? "DISABLED" : "ACTIVE"),
                status === "ACTIVE" ? u.disabled : u.enabled,
              )
            }
          >
            <PowerIcon aria-hidden="true" />
            {status === "ACTIVE" ? u.disable : u.enable}
          </Button>
        ) : null}
        {can.delete ? (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive"
            disabled={pending}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2Icon aria-hidden="true" />
            {c.delete}
          </Button>
        ) : null}
      </div>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{c.confirmDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block font-medium text-foreground">{userName}</span>
              {u.deleteHint} {c.confirmDeleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{c.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                run(
                  () => deleteUserAction(userId),
                  c.toast.deleted,
                  () => {
                    setConfirmDelete(false);
                    router.push("/admin/users");
                    router.refresh();
                  },
                );
              }}
            >
              {pending ? c.deleting : c.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
