"use client";

import { EyeIcon, EyeOffIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AdminMessages } from "@/i18n/admin";
import type { ActionResult } from "@/lib/actions";

type RowActionsProps = {
  itemLabel: string;
  editHref?: string;
  published?: boolean;
  onPublish?: (published: boolean) => Promise<ActionResult<unknown>>;
  onDelete?: () => Promise<ActionResult<unknown>>;
  labels: AdminMessages["common"];
};

/** Per-row menu: edit, publish/unpublish, delete (with confirmation). Omitted actions aren't shown. */
export function RowActions({
  itemLabel,
  editHref,
  published,
  onPublish,
  onDelete,
  labels,
}: RowActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const run = (action: () => Promise<ActionResult<unknown>>, success: string) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(success);
        setConfirmOpen(false);
        router.refresh();
      } else {
        toast.error(labels.errors[result.error]);
      }
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={pending}
            aria-label={`${labels.actions}: ${itemLabel}`}
          >
            <MoreHorizontalIcon aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {editHref ? (
            <DropdownMenuItem asChild>
              <Link href={editHref as Route}>
                <PencilIcon aria-hidden="true" />
                {labels.edit}
              </Link>
            </DropdownMenuItem>
          ) : null}
          {onPublish ? (
            <DropdownMenuItem
              onSelect={() =>
                run(
                  () => onPublish(!published),
                  published ? labels.toast.unpublished : labels.toast.published,
                )
              }
            >
              {published ? <EyeOffIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
              {published ? labels.unpublish : labels.publish}
            </DropdownMenuItem>
          ) : null}
          {onDelete ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
                <Trash2Icon aria-hidden="true" />
                {labels.delete}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {onDelete ? (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{labels.confirmDeleteTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                <span className="block font-medium text-foreground">{itemLabel}</span>
                {labels.confirmDeleteDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>{labels.cancel}</AlertDialogCancel>
              <AlertDialogAction
                disabled={pending}
                variant="destructive"
                onClick={(event) => {
                  event.preventDefault();
                  run(onDelete, labels.toast.deleted);
                }}
              >
                {pending ? labels.deleting : labels.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  );
}
