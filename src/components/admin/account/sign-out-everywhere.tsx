"use client";

import { LogOutIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

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
import type { AdminMessages } from "@/i18n/admin";
import { signOutEverywhereAction } from "@/server/actions/users";

/** Ends every session (lost phone, shared computer), after a confirmation. */
export function SignOutEverywhere({
  labels,
}: {
  labels: Pick<AdminMessages, "common" | "account">;
}) {
  const a = labels.account;
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      <p className="text-sm text-muted-foreground">{a.signOutEverywhereHint}</p>
      <Button variant="outline" className="w-fit" onClick={() => setOpen(true)}>
        <LogOutIcon aria-hidden="true" />
        {a.signOutEverywhere}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{a.signOutEverywhereTitle}</AlertDialogTitle>
            <AlertDialogDescription>{a.signOutEverywhereDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{labels.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                start(async () => {
                  // On success the server redirects to the sign-in page.
                  const result = await signOutEverywhereAction();
                  if (!result.ok) toast.error(labels.common.errors[result.error]);
                });
              }}
            >
              {a.signOutEverywhere}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
