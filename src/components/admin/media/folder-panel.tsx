"use client";

import {
  FolderIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { AdminMessages } from "@/i18n/admin";
import { cn } from "@/lib/utils";
import { createFolderAction, deleteFolderAction, renameFolderAction } from "@/server/actions/media";

type Folder = { id: string; name: string; count: number };
type Labels = Pick<AdminMessages, "common" | "validation" | "media">;

function FolderDialog({
  folder,
  labels,
  onClose,
}: {
  folder: Folder | null;
  labels: Labels;
  onClose: () => void;
}) {
  const router = useRouter();
  const action = folder ? renameFolderAction.bind(null, folder.id) : createFolderAction;
  const { onSubmit, pending, errorFor } = useActionForm(action, labels, {
    successMessage: folder ? labels.common.toast.saved : labels.common.toast.created,
    onSuccess: () => {
      onClose();
      router.refresh();
    },
  });
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{folder ? labels.media.renameFolder : labels.media.newFolder}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormField id="folder-name" label={labels.media.folderName} error={errorFor("name")}>
            {(a) => (
              <Input {...a} name="name" defaultValue={folder?.name} maxLength={120} autoFocus />
            )}
          </FormField>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {labels.common.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? labels.common.saving : labels.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function FolderPanel({
  folders,
  current,
  baseQuery,
  can,
  labels,
}: {
  folders: Folder[];
  current: string | undefined;
  baseQuery: Record<string, string | undefined>;
  can: { create: boolean; update: boolean; delete: boolean };
  labels: Labels;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Folder | null | "new">(null);
  const [deleting, setDeleting] = useState<Folder | null>(null);
  const [pending, start] = useTransition();
  const m = labels.media;

  const href = (folder?: string) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...baseQuery, folder })) if (v) params.set(k, v);
    const qs = params.toString();
    return (qs ? `/admin/media?${qs}` : "/admin/media") as Route;
  };
  const item = (active: boolean) =>
    cn(
      "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
      active && "bg-accent font-medium",
    );

  return (
    <nav aria-label={m.folders} className="grid content-start gap-1">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{m.folders}</h2>
        {can.create ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setEditing("new")}
            aria-label={m.newFolder}
          >
            <FolderPlusIcon aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      <Link href={href()} className={item(!current)} aria-current={!current ? "page" : undefined}>
        <FolderOpenIcon className="size-4 shrink-0" aria-hidden="true" />
        {m.allFolders}
      </Link>
      <Link
        href={href("none")}
        className={item(current === "none")}
        aria-current={current === "none" ? "page" : undefined}
      >
        <FolderIcon className="size-4 shrink-0 opacity-50" aria-hidden="true" />
        {m.noFolder}
      </Link>
      {folders.map((folder) => (
        <div key={folder.id} className="flex items-center">
          <Link
            href={href(folder.id)}
            className={item(current === folder.id)}
            aria-current={current === folder.id ? "page" : undefined}
          >
            <FolderIcon className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{folder.name}</span>
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {folder.count}
            </span>
          </Link>
          {can.update || can.delete ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${labels.common.actions}: ${folder.name}`}
                >
                  <MoreHorizontalIcon aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {can.update ? (
                  <DropdownMenuItem onSelect={() => setEditing(folder)}>
                    <PencilIcon aria-hidden="true" />
                    {m.renameFolder}
                  </DropdownMenuItem>
                ) : null}
                {can.delete ? (
                  <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(folder)}>
                    <Trash2Icon aria-hidden="true" />
                    {m.deleteFolder}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      ))}

      {editing ? (
        <FolderDialog
          folder={editing === "new" ? null : editing}
          labels={labels}
          onClose={() => setEditing(null)}
        />
      ) : null}

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{labels.common.confirmDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block font-medium text-foreground">{deleting?.name}</span>
              {m.deleteFolderHint}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{labels.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                const folder = deleting;
                if (!folder) return;
                start(async () => {
                  const r = await deleteFolderAction(folder.id);
                  if (r.ok) {
                    toast.success(labels.common.toast.deleted);
                    setDeleting(null);
                    router.push(href());
                    router.refresh();
                  } else toast.error(labels.common.errors[r.error]);
                });
              }}
            >
              {pending ? labels.common.deleting : labels.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  );
}
