"use client";

import { CheckCircle2Icon, RotateCcwIcon, Trash2Icon } from "lucide-react";
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
import { assignChatAction, deleteChatAction, setChatStatusAction } from "@/server/actions/chats";

/** Assignee saves as soon as it changes; close, reopen and delete are explicit. */
export function ChatControls({
  id,
  status,
  assigneeId,
  staff,
  can,
  visitorName,
  labels,
}: {
  id: string;
  status: "OPEN" | "CLOSED";
  assigneeId: string | null;
  staff: { id: string; name: string }[];
  can: { reply: boolean; delete: boolean };
  visitorName: string;
  labels: Pick<AdminMessages, "common" | "validation" | "chats">;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const ch = labels.chats;
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

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <label htmlFor="chat-assignee" className="text-sm font-medium">
          {ch.assignee}
        </label>
        <NativeSelect
          id="chat-assignee"
          value={assigneeId ?? ""}
          disabled={!can.reply || pending}
          onChange={(e) =>
            run(() => assignChatAction(id, e.target.value || null), ch.assignedToast)
          }
          className="w-full"
        >
          <NativeSelectOption value="">{ch.nobody}</NativeSelectOption>
          {staff.map((u) => (
            <NativeSelectOption key={u.id} value={u.id}>
              {u.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      {can.reply || can.delete ? (
        <div className="flex flex-wrap gap-2 border-t pt-4">
          {can.reply ? (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                status === "OPEN"
                  ? run(() => setChatStatusAction(id, "CLOSED"), ch.closedToast)
                  : run(() => setChatStatusAction(id, "OPEN"), ch.reopenedToast)
              }
            >
              {status === "OPEN" ? (
                <CheckCircle2Icon aria-hidden="true" />
              ) : (
                <RotateCcwIcon aria-hidden="true" />
              )}
              {status === "OPEN" ? ch.close : ch.reopen}
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
              <span className="block font-medium text-foreground">{visitorName}</span>
              {ch.deleteHint} {c.confirmDeleteDescription}
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
                  () => deleteChatAction(id),
                  c.toast.deleted,
                  () => {
                    setConfirmOpen(false);
                    router.push("/admin/chats");
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
