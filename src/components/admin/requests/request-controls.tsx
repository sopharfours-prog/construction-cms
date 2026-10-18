"use client";

import { ArchiveIcon, ArchiveRestoreIcon, Trash2Icon } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
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
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { AdminMessages } from "@/i18n/admin";
import type { ActionResult } from "@/lib/actions";
import {
  assignRequestAction,
  deleteRequestAction,
  setRequestArchivedAction,
  setRequestStatusAction,
} from "@/server/actions/requests";

type Props = {
  kind: "inquiry" | "quote";
  id: string;
  status: string;
  statuses: { value: string; label: string }[];
  assigneeId: string | null;
  staff: { id: string; name: string }[];
  archived: boolean;
  can: { update: boolean; delete: boolean };
  itemLabel: string;
  labels: Pick<AdminMessages, "common" | "validation" | "requests">;
};

/** Status and assignee save as soon as they change; archive and delete are explicit. */
export function RequestControls({
  kind,
  id,
  status,
  statuses,
  assigneeId,
  staff,
  archived,
  can,
  itemLabel,
  labels,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const r = labels.requests;
  const c = labels.common;

  const run = (action: () => Promise<ActionResult<unknown>>, success: string, after?: () => void) =>
    start(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(success);
        if (after) after();
        else router.refresh();
      } else {
        const key = result.fieldErrors ? Object.values(result.fieldErrors)[0] : undefined;
        toast.error(
          (key && labels.validation[key as keyof typeof labels.validation]) ||
            c.errors[result.error],
        );
        router.refresh();
      }
    });

  const listPath = (kind === "inquiry" ? "/admin/inquiries" : "/admin/quotes") as Route;

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <label htmlFor="request-status" className="text-sm font-medium">
          {r.status}
        </label>
        <NativeSelect
          id="request-status"
          value={status}
          disabled={!can.update || pending}
          onChange={(e) =>
            run(() => setRequestStatusAction(kind, id, e.target.value), r.statusToast)
          }
          className="w-full"
        >
          {statuses.map((s) => (
            <NativeSelectOption key={s.value} value={s.value}>
              {s.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="request-assignee" className="text-sm font-medium">
          {r.assignee}
        </label>
        <NativeSelect
          id="request-assignee"
          value={assigneeId ?? ""}
          disabled={!can.update || pending}
          onChange={(e) =>
            run(() => assignRequestAction(kind, id, e.target.value || null), r.assignedToast)
          }
          className="w-full"
        >
          <NativeSelectOption value="">{r.nobody}</NativeSelectOption>
          {staff.map((u) => (
            <NativeSelectOption key={u.id} value={u.id}>
              {u.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      {can.update || can.delete ? (
        <div className="flex flex-wrap gap-2 border-t pt-4">
          {can.update ? (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(
                  () => setRequestArchivedAction(kind, id, !archived),
                  archived ? r.unarchivedToast : r.archivedToast,
                )
              }
            >
              {archived ? (
                <ArchiveRestoreIcon aria-hidden="true" />
              ) : (
                <ArchiveIcon aria-hidden="true" />
              )}
              {archived ? r.unarchive : r.archive}
            </Button>
          ) : null}
          {can.delete ? (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              disabled={pending}
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2Icon aria-hidden="true" />
              {c.delete}
            </Button>
          ) : null}
        </div>
      ) : null}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{c.confirmDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block font-medium text-foreground">{itemLabel}</span>
              {r.deleteHint} {c.confirmDeleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{c.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                run(
                  () => deleteRequestAction(kind, id),
                  c.toast.deleted,
                  () => {
                    setConfirmOpen(false);
                    router.push(listPath);
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
