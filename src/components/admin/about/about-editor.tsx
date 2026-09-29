"use client";

import { ArrowDownIcon, ArrowUpIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormField, fieldId } from "@/components/admin/form/form-field";
import { TranslationTabs } from "@/components/admin/form/translation-tabs";
import { useActionForm } from "@/components/admin/form/use-action-form";
import { MediaField } from "@/components/admin/media/media-field";
import type { PickedImage } from "@/components/admin/media/media-picker";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/config/i18n";
import type { AdminMessages } from "@/i18n/admin";
import type { ActionResult } from "@/lib/actions";
import {
  deleteAboutItemAction,
  moveAboutItemAction,
  saveCertificationAction,
  saveMilestoneAction,
  saveTeamMemberAction,
} from "@/server/actions/about";

type Labels = Pick<AdminMessages, "common" | "validation" | "about" | "media">;
type Kind = "team" | "certification" | "milestone";
type Tr = Record<string, string | null> & { locale: string };

export type AboutItem = {
  id: string;
  status: "DRAFT" | "PUBLISHED" | "SCHEDULED" | "ARCHIVED";
  label: string;
  sub?: string;
  translations: Tr[];
  image?: PickedImage | null;
  year?: number;
  issuedAt?: string;
  expiresAt?: string;
};

const actions: Record<
  Kind,
  (
    id: string | null,
    prev: ActionResult<unknown> | null,
    fd: FormData,
  ) => Promise<ActionResult<unknown>>
> = {
  team: saveTeamMemberAction,
  certification: saveCertificationAction,
  milestone: saveMilestoneAction,
};

function ItemDialog({
  kind,
  item,
  labels,
  onClose,
}: {
  kind: Kind;
  item: AboutItem | null;
  labels: Labels;
  onClose: () => void;
}) {
  const router = useRouter();
  const f = labels.about.fields;
  const c = labels.common;
  const { formAction, pending, fieldErrors, errorFor } = useActionForm(
    actions[kind].bind(null, item?.id ?? null),
    labels,
    {
      successMessage: item ? c.toast.saved : c.toast.created,
      onSuccess: () => {
        onClose();
        router.refresh();
      },
    },
  );
  const tr = (locale: Locale, key: string) =>
    item?.translations.find((t) => t.locale === locale)?.[key] ?? "";
  const textFields: Record<Kind, [string, string, "input" | "textarea", number][]> = {
    team: [
      ["name", f.name, "input", 160],
      ["position", f.position, "input", 160],
      ["bio", f.bio, "textarea", 1000],
    ],
    certification: [
      ["name", f.certName, "input", 200],
      ["issuer", f.issuer, "input", 200],
      ["description", f.certDescription, "textarea", 1000],
    ],
    milestone: [
      ["title", f.title, "input", 200],
      ["description", f.milestoneDescription, "textarea", 1000],
    ],
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {item ? `${labels.about.edit}: ${item.label}` : labels.about.add}
          </DialogTitle>
          <DialogDescription className="sr-only">{labels.about.description}</DialogDescription>
        </DialogHeader>
        <form action={formAction} noValidate className="grid gap-5">
          <TranslationTabs fieldErrors={fieldErrors} labels={c}>
            {(locale) =>
              textFields[kind].map(([key, label, type, max]) => {
                const name = `translations.${locale}.${key}`;
                return (
                  <FormField key={key} id={fieldId(name)} label={label} error={errorFor(name)}>
                    {(a) =>
                      type === "textarea" ? (
                        <Textarea
                          {...a}
                          name={name}
                          defaultValue={tr(locale, key) ?? ""}
                          maxLength={max}
                          rows={3}
                        />
                      ) : (
                        <Input
                          {...a}
                          name={name}
                          defaultValue={tr(locale, key) ?? ""}
                          maxLength={max}
                        />
                      )
                    }
                  </FormField>
                );
              })
            }
          </TranslationTabs>
          <div className="grid gap-4 sm:grid-cols-2">
            {kind === "milestone" ? (
              <FormField id="a-year" label={f.year} error={errorFor("year")}>
                {(a) => (
                  <Input
                    {...a}
                    name="year"
                    inputMode="numeric"
                    defaultValue={item?.year ?? ""}
                    maxLength={4}
                  />
                )}
              </FormField>
            ) : null}
            {kind === "certification" ? (
              <>
                <FormField id="a-issued" label={f.issuedAt} error={errorFor("issuedAt")}>
                  {(a) => (
                    <Input {...a} type="date" name="issuedAt" defaultValue={item?.issuedAt ?? ""} />
                  )}
                </FormField>
                <FormField id="a-expires" label={f.expiresAt} error={errorFor("expiresAt")}>
                  {(a) => (
                    <Input
                      {...a}
                      type="date"
                      name="expiresAt"
                      defaultValue={item?.expiresAt ?? ""}
                    />
                  )}
                </FormField>
              </>
            ) : null}
            <FormField id="a-status" label={f.status} error={errorFor("status")}>
              {(a) => (
                <NativeSelect
                  {...a}
                  name="status"
                  defaultValue={item?.status === "PUBLISHED" || !item ? "PUBLISHED" : "DRAFT"}
                  className="w-full"
                >
                  <NativeSelectOption value="PUBLISHED">
                    {c.contentStatus.PUBLISHED}
                  </NativeSelectOption>
                  <NativeSelectOption value="DRAFT">{c.contentStatus.DRAFT}</NativeSelectOption>
                </NativeSelect>
              )}
            </FormField>
          </div>
          {kind !== "milestone" ? (
            <MediaField
              name={kind === "team" ? "photoId" : "imageId"}
              label={kind === "team" ? f.photo : f.image}
              error={errorFor(kind === "team" ? "photoId" : "imageId")}
              defaultValue={item?.image ?? null}
              labels={labels}
            />
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {c.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner aria-hidden="true" /> : null}
              {pending ? c.saving : c.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  kind,
  title,
  items,
  canEdit,
  canDelete,
  labels,
}: {
  kind: Kind;
  title: string;
  items: AboutItem[];
  canEdit: boolean;
  canDelete: boolean;
  labels: Labels;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<AboutItem | null | "new">(null);
  const [deleting, setDeleting] = useState<AboutItem | null>(null);
  const [pending, start] = useTransition();
  const c = labels.common;
  const run = (fn: () => Promise<ActionResult<unknown>>, message: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(message);
        after?.();
        router.refresh();
      } else toast.error(c.errors[r.error]);
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {canEdit ? (
          <CardAction>
            <Button size="sm" variant="outline" onClick={() => setEditing("new")}>
              <PlusIcon aria-hidden="true" />
              {labels.about.add}
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.about.empty}</p>
        ) : (
          <ol className="divide-y">
            {items.map((item, i) => (
              <li key={item.id} className="flex items-center gap-2 py-2.5">
                {canEdit && kind !== "milestone" ? (
                  <div className="flex">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={pending || i === 0}
                      onClick={() =>
                        run(() => moveAboutItemAction(kind, item.id, "up"), c.toast.reordered)
                      }
                      aria-label={`${c.moveUp}: ${item.label}`}
                    >
                      <ArrowUpIcon aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={pending || i === items.length - 1}
                      onClick={() =>
                        run(() => moveAboutItemAction(kind, item.id, "down"), c.toast.reordered)
                      }
                      aria-label={`${c.moveDown}: ${item.label}`}
                    >
                      <ArrowDownIcon aria-hidden="true" />
                    </Button>
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.label}</p>
                  {item.sub ? (
                    <p className="truncate text-xs text-muted-foreground">{item.sub}</p>
                  ) : null}
                </div>
                {item.status !== "PUBLISHED" ? (
                  <Badge variant="secondary">{labels.about.draft}</Badge>
                ) : null}
                {canEdit ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setEditing(item)}
                    aria-label={`${labels.about.edit}: ${item.label}`}
                  >
                    <PencilIcon aria-hidden="true" />
                  </Button>
                ) : null}
                {canDelete ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleting(item)}
                    aria-label={`${c.delete}: ${item.label}`}
                  >
                    <Trash2Icon aria-hidden="true" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
      {editing ? (
        <ItemDialog
          kind={kind}
          item={editing === "new" ? null : editing}
          labels={labels}
          onClose={() => setEditing(null)}
        />
      ) : null}
      <AlertDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{c.confirmDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block font-medium text-foreground">{deleting?.label}</span>
              {c.confirmDeleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{c.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                const target = deleting;
                if (target)
                  run(
                    () => deleteAboutItemAction(kind, target.id),
                    c.toast.deleted,
                    () => setDeleting(null),
                  );
              }}
            >
              {pending ? c.deleting : c.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export function AboutEditor({
  team,
  certifications,
  milestones,
  canEdit,
  canDelete,
  labels,
}: {
  team: AboutItem[];
  certifications: AboutItem[];
  milestones: AboutItem[];
  canEdit: boolean;
  canDelete: boolean;
  labels: Labels;
}) {
  const a = labels.about;
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Section
        kind="team"
        title={a.team}
        items={team}
        canEdit={canEdit}
        canDelete={canDelete}
        labels={labels}
      />
      <Section
        kind="certification"
        title={a.certifications}
        items={certifications}
        canEdit={canEdit}
        canDelete={canDelete}
        labels={labels}
      />
      <Section
        kind="milestone"
        title={a.milestones}
        items={milestones}
        canEdit={canEdit}
        canDelete={canDelete}
        labels={labels}
      />
    </div>
  );
}
