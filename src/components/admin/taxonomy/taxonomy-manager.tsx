"use client";

import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
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
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { fmt } from "@/i18n/format";
import type { AdminMessages } from "@/i18n/admin";
import { slugify } from "@/lib/content/slug";
import { deleteTaxonomyAction, saveTaxonomyAction } from "@/server/actions/taxonomy";

type Item = {
  id: string;
  slug: string;
  name: string;
  names: { lo: string; en: string };
  usage: number;
};
type Group =
  | { kind: "category"; type: "PROJECT" | "NEWS"; title: string; items: Item[] }
  | { kind: "tag"; title: string; items: Item[] };
type Labels = Pick<AdminMessages, "common" | "validation" | "taxonomy">;

function EditDialog({
  group,
  item,
  labels,
  onClose,
}: {
  group: Group;
  item: Item | null;
  labels: Labels;
  onClose: () => void;
}) {
  const router = useRouter();
  const t = labels.taxonomy;
  const { onSubmit, pending, errorFor } = useActionForm(
    saveTaxonomyAction.bind(null, item?.id ?? null),
    labels,
    {
      successMessage: item ? labels.common.toast.saved : labels.common.toast.created,
      onSuccess: () => {
        onClose();
        router.refresh();
      },
    },
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {item ? `${t.editItem}: ${item.name}` : `${t.add}: ${group.title}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <input type="hidden" name="kind" value={group.kind} />
          {group.kind === "category" ? (
            <input type="hidden" name="type" value={group.type} />
          ) : null}
          <FormField id="tx-lo" label={t.fields.nameLo} error={errorFor("names.lo")}>
            {(a) => (
              <Input
                {...a}
                name="names.lo"
                lang="lo"
                defaultValue={item?.names.lo}
                maxLength={160}
                autoFocus
              />
            )}
          </FormField>
          <FormField
            id="tx-en"
            label={t.fields.nameEn}
            optionalLabel={labels.common.optional}
            error={errorFor("names.en")}
          >
            {(a) => (
              <Input
                {...a}
                name="names.en"
                lang="en"
                defaultValue={item?.names.en}
                maxLength={160}
                onBlur={(e) => {
                  const slug = e.currentTarget.form?.elements.namedItem("slug");
                  if (slug instanceof HTMLInputElement && !slug.value)
                    slug.value = slugify(e.currentTarget.value);
                }}
              />
            )}
          </FormField>
          <FormField
            id="tx-slug"
            label={t.fields.slug}
            hint={labels.common.slugHint}
            error={errorFor("slug")}
          >
            {(a) => (
              <Input
                {...a}
                name="slug"
                defaultValue={item?.slug}
                className="font-mono"
                maxLength={160}
                spellCheck={false}
              />
            )}
          </FormField>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {labels.common.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner aria-hidden="true" /> : null}
              {pending ? labels.common.saving : labels.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TaxonomyManager({ groups, labels }: { groups: Group[]; labels: Labels }) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ group: Group; item: Item | null } | null>(null);
  const [deleting, setDeleting] = useState<{ group: Group; item: Item } | null>(null);
  const [pending, start] = useTransition();
  const t = labels.taxonomy;
  const c = labels.common;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {groups.map((group) => (
        <Card key={group.title}>
          <CardHeader>
            <CardTitle className="text-base">{group.title}</CardTitle>
            <CardAction>
              <Button size="sm" variant="outline" onClick={() => setEditing({ group, item: null })}>
                <PlusIcon aria-hidden="true" />
                {t.add}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {group.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.empty}</p>
            ) : (
              <ul className="divide-y">
                {group.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        <span className="font-mono">{item.slug}</span> ·{" "}
                        {fmt(t.usage, { count: item.usage })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditing({ group, item })}
                      aria-label={`${t.editItem}: ${item.name}`}
                    >
                      <PencilIcon aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleting({ group, item })}
                      aria-label={`${c.delete}: ${item.name}`}
                    >
                      <Trash2Icon aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}

      {editing ? (
        <EditDialog
          group={editing.group}
          item={editing.item}
          labels={labels}
          onClose={() => setEditing(null)}
        />
      ) : null}

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{c.confirmDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block font-medium text-foreground">{deleting?.item.name}</span>
              {deleting && deleting.item.usage > 0
                ? `${fmt(t.usage, { count: deleting.item.usage })}. ${t.deleteHint} `
                : null}
              {c.confirmDeleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{c.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              variant="destructive"
              onClick={(event) => {
                event.preventDefault();
                if (!deleting) return;
                start(async () => {
                  const r = await deleteTaxonomyAction(deleting.group.kind, deleting.item.id);
                  if (r.ok) {
                    toast.success(c.toast.deleted);
                    setDeleting(null);
                    router.refresh();
                  } else toast.error(c.errors[r.error]);
                });
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
