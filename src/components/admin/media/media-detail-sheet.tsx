"use client";

import { CopyIcon, ExternalLinkIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
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
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/config/i18n";
import type { AdminMessages } from "@/i18n/admin";
import { formatBytes, formatDateTime } from "@/lib/format";

import { MediaThumb } from "./media-thumb";
import { describeApiError, type UploadedMedia, uploadWithProgress } from "./upload-client";

type Detail = UploadedMedia & {
  updatedAt: string;
  uploadedBy: { name: string } | null;
  folder: { name: string } | null;
  usage: { type: keyof AdminMessages["media"]["usage"]; id: string; label: string }[];
};

type Props = {
  mediaId: string | null;
  onClose: () => void;
  folders: { id: string; name: string }[];
  can: { update: boolean; upload: boolean; delete: boolean };
  locale: Locale;
  labels: Pick<AdminMessages, "common" | "validation" | "media">;
};

const usageHref: Record<Detail["usage"][number]["type"], (id: string) => string | null> = {
  project: (id) => `/admin/projects/${id}`,
  projectGallery: (id) => `/admin/projects/${id}`,
  service: (id) => `/admin/services/${id}`,
  news: (id) => `/admin/news/${id}`,
  newsSeo: (id) => `/admin/news/${id}`,
  page: (id) => `/admin/pages/${id}`,
  team: () => null,
  certification: () => null,
  avatar: () => null,
  // The usage id is the settings field: the share image is under SEO, logo and favicon under General.
  settings: (field) =>
    field === "ogImageMediaId" ? "/admin/settings/seo" : "/admin/settings/general",
};

/** Settings usage carries the field name; show it in the admin's language. */
function usageSettingsLabel(field: string, m: AdminMessages["media"]) {
  const labels: Record<string, string> = m.usageSettings;
  return labels[field] ?? field;
}

export function MediaDetailSheet({ mediaId, onClose, folders, can, locale, labels }: Props) {
  const router = useRouter();
  const m = labels.media;
  const c = labels.common;
  const [detail, setDetail] = useState<Detail | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, startSaving] = useTransition();
  const [deleting, startDeleting] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [replaceProgress, setReplaceProgress] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const fetchDetail = useCallback(
    async (id: string): Promise<Detail | null> => {
      const response = await fetch(`/api/media/${id}?locale=${locale}`, { cache: "no-store" });
      return response.ok ? ((await response.json()) as Detail) : null;
    },
    [locale],
  );

  // The parent remounts this component per file (key), so state starts empty.
  // `ignore` drops a slow response for a file the user already moved away from.
  useEffect(() => {
    if (!mediaId) return;
    let ignore = false;
    void fetchDetail(mediaId).then((result) => {
      if (ignore) return;
      setDetail(result);
      setFailed(!result);
    });
    return () => {
      ignore = true;
    };
  }, [mediaId, fetchDetail]);

  const save = (form: HTMLFormElement) =>
    startSaving(async () => {
      if (!detail) return;
      const data = new FormData(form);
      const response = await fetch(`/api/media/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          altText: data.get("altText"),
          caption: data.get("caption"),
          folderId: data.get("folderId"),
        }),
      });
      if (response.ok) {
        toast.success(c.toast.saved);
        router.refresh();
      } else toast.error(describeApiError(await response.json().catch(() => null), labels));
    });

  const replace = async (file: File) => {
    if (!detail) return;
    setReplaceProgress(0);
    const result = await uploadWithProgress(
      `/api/media/${detail.id}/file`,
      file,
      {},
      setReplaceProgress,
    );
    setReplaceProgress(null);
    if (result.ok) {
      toast.success(m.replaced);
      const fresh = await fetchDetail(detail.id);
      if (fresh) setDetail(fresh);
      router.refresh();
    } else toast.error(describeApiError(result.body, labels));
  };

  const remove = () =>
    startDeleting(async () => {
      if (!detail) return;
      const response = await fetch(`/api/media/${detail.id}`, { method: "DELETE" });
      if (response.ok) {
        toast.success(c.toast.deleted);
        setConfirmOpen(false);
        onClose();
        router.refresh();
      } else toast.error(describeApiError(await response.json().catch(() => null), labels));
    });

  const absoluteUrl = detail ? new URL(detail.url, window.location.origin).toString() : "";
  const inUse = (detail?.usage.length ?? 0) > 0;

  return (
    <Sheet open={Boolean(mediaId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="truncate pr-6">{detail?.originalName ?? m.details}</SheetTitle>
          <SheetDescription className="sr-only">{m.details}</SheetDescription>
        </SheetHeader>

        {failed ? <p className="px-4 text-sm text-destructive">{c.errors.notFound}</p> : null}
        {!detail && !failed ? (
          <div className="grid gap-3 px-4">
            <Skeleton className="aspect-square" />
            <Skeleton className="h-24" />
          </div>
        ) : null}

        {detail ? (
          <div className="grid gap-6 px-4 pb-6">
            {detail.kind === "VIDEO" ? (
              <video
                src={detail.url}
                controls
                preload="metadata"
                className="w-full rounded-md bg-black"
              />
            ) : (
              <MediaThumb media={detail} sizes="448px" className="rounded-md" />
            )}

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">{m.meta.type}</dt>
              <dd className="truncate">{detail.mimeType}</dd>
              <dt className="text-muted-foreground">{m.meta.size}</dt>
              <dd>{formatBytes(detail.size, locale)}</dd>
              {detail.width ? (
                <>
                  <dt className="text-muted-foreground">{m.meta.dimensions}</dt>
                  <dd className="tabular-nums">
                    {detail.width} × {detail.height}
                  </dd>
                </>
              ) : null}
              <dt className="text-muted-foreground">{m.meta.uploadedBy}</dt>
              <dd>{detail.uploadedBy?.name ?? "—"}</dd>
              <dt className="text-muted-foreground">{m.meta.uploadedAt}</dt>
              <dd>{formatDateTime(new Date(detail.createdAt), locale)}</dd>
            </dl>

            <div className="flex gap-2">
              <Input
                readOnly
                value={absoluteUrl}
                aria-label={m.meta.url}
                className="font-mono text-xs"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button
                variant="outline"
                size="icon"
                aria-label={m.copyUrl}
                onClick={() =>
                  navigator.clipboard.writeText(absoluteUrl).then(
                    () => toast.success(m.copied),
                    () => toast.error(c.errors.unexpected),
                  )
                }
              >
                <CopyIcon aria-hidden="true" />
              </Button>
              <Button asChild variant="outline" size="icon">
                <a
                  href={detail.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={m.preview}
                >
                  <ExternalLinkIcon aria-hidden="true" />
                </a>
              </Button>
            </div>

            <form
              key={detail.id + detail.updatedAt}
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                save(e.currentTarget);
              }}
            >
              <fieldset disabled={!can.update || saving} className="grid gap-4">
                <div className="grid gap-1.5">
                  <label htmlFor="media-alt" className="text-sm font-medium">
                    {m.fields.altText}
                  </label>
                  <Input
                    id="media-alt"
                    name="altText"
                    defaultValue={detail.altText ?? ""}
                    maxLength={255}
                    aria-describedby="media-alt-hint"
                  />
                  <p id="media-alt-hint" className="text-xs text-muted-foreground">
                    {m.fields.altHint}
                  </p>
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="media-caption" className="text-sm font-medium">
                    {m.fields.caption}
                  </label>
                  <Textarea
                    id="media-caption"
                    name="caption"
                    defaultValue={detail.caption ?? ""}
                    maxLength={500}
                    rows={2}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="media-folder" className="text-sm font-medium">
                    {m.fields.folder}
                  </label>
                  <NativeSelect
                    id="media-folder"
                    name="folderId"
                    defaultValue={detail.folderId ?? ""}
                    className="w-full"
                  >
                    <NativeSelectOption value="">{m.noFolder}</NativeSelectOption>
                    {folders.map((f) => (
                      <NativeSelectOption key={f.id} value={f.id}>
                        {f.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
                {can.update ? (
                  <Button type="submit" className="w-fit">
                    {saving ? <Spinner aria-hidden="true" /> : null}
                    {saving ? c.saving : c.save}
                  </Button>
                ) : null}
              </fieldset>
            </form>

            <section className="grid gap-2">
              <h3 className="text-sm font-medium">{m.usedIn}</h3>
              {detail.usage.length === 0 ? (
                <p className="text-sm text-muted-foreground">{m.notUsed}</p>
              ) : (
                <ul className="grid gap-1 text-sm">
                  {detail.usage.map((u, i) => {
                    const href = usageHref[u.type](u.id);
                    return (
                      <li key={`${u.type}-${u.id}-${i}`}>
                        <span className="text-muted-foreground">{m.usage[u.type]}: </span>
                        {href ? (
                          <Link href={href as Route} className="hover:underline">
                            {u.type === "settings" ? usageSettingsLabel(u.id, m) : u.label}
                          </Link>
                        ) : (
                          u.label
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {can.upload || can.delete ? (
              <section className="grid gap-3 border-t pt-4">
                {can.upload ? (
                  <div className="grid gap-1.5">
                    <input
                      ref={fileInput}
                      type="file"
                      className="sr-only"
                      tabIndex={-1}
                      aria-hidden="true"
                      onChange={(e) => {
                        const file = e.currentTarget.files?.[0];
                        e.currentTarget.value = "";
                        if (file) void replace(file);
                      }}
                    />
                    <Button
                      variant="outline"
                      className="w-fit"
                      disabled={replaceProgress !== null}
                      onClick={() => fileInput.current?.click()}
                    >
                      <RefreshCwIcon aria-hidden="true" />
                      {m.replace}
                    </Button>
                    {replaceProgress !== null ? (
                      <Progress
                        value={Math.round(replaceProgress * 100)}
                        className="h-1.5"
                        aria-label={m.replace}
                      />
                    ) : null}
                    <p className="text-xs text-muted-foreground">{m.replaceHint}</p>
                  </div>
                ) : null}
                {can.delete ? (
                  <div className="grid gap-1.5">
                    <Button
                      variant="outline"
                      className="w-fit text-destructive"
                      disabled={inUse}
                      onClick={() => setConfirmOpen(true)}
                    >
                      <Trash2Icon aria-hidden="true" />
                      {c.delete}
                    </Button>
                    {inUse ? (
                      <p className="text-xs text-muted-foreground">{m.inUseCannotDelete}</p>
                    ) : null}
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>
        ) : null}

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{c.confirmDeleteTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                <span className="block font-medium text-foreground">{detail?.originalName}</span>
                {c.confirmDeleteDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>{c.cancel}</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleting}
                variant="destructive"
                onClick={(e) => {
                  e.preventDefault();
                  remove();
                }}
              >
                {deleting ? c.deleting : c.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
