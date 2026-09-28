"use client";

import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, UploadIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminMessages } from "@/i18n/admin";
import { fmt } from "@/i18n/format";
import { cn } from "@/lib/utils";

import { MediaThumb } from "./media-thumb";
import { describeApiError, type UploadedMedia } from "./upload-client";
import { UploadProgress } from "./upload-progress";
import { useUploader } from "./use-uploader";

export type PickedImage = Pick<
  UploadedMedia,
  "id" | "url" | "altText" | "blurDataUrl" | "originalName" | "kind" | "mimeType"
>;

type Labels = Pick<AdminMessages, "common" | "validation" | "media">;
type Page = { items: UploadedMedia[]; page: number; pageCount: number };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  multiple?: boolean;
  onSelect: (items: PickedImage[]) => void;
  labels: Labels;
};

/** Choose images from the library (with search and in-place upload). */
export function MediaPicker({ open, onOpenChange, multiple = false, onSelect, labels }: Props) {
  const m = labels.media;
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Map<string, PickedImage>>(new Map());
  const [reload, setReload] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const uploader = useUploader({
    labels,
    onComplete: (items) => {
      const images = items.filter((i) => i.kind === "IMAGE");
      if (images.length) {
        setSelected((current) => {
          const next = multiple ? new Map(current) : new Map<string, PickedImage>();
          for (const image of multiple ? images : images.slice(0, 1)) next.set(image.id, image);
          return next;
        });
      }
      setPage(1);
      setReload((n) => n + 1);
    },
  });

  useEffect(() => {
    if (!open) return;
    let ignore = false;
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({ kind: "IMAGE", page: String(page), pageSize: "18" });
      if (query) params.set("q", query);
      const response = await fetch(`/api/media?${params}`, { cache: "no-store" });
      if (ignore) return;
      if (response.ok) {
        setData((await response.json()) as Page);
        setError(null);
      } else setError(describeApiError(await response.json().catch(() => null), labels));
    }, 250);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [open, page, query, reload, labels]);

  const toggle = (item: PickedImage) =>
    setSelected((current) => {
      if (!multiple) return new Map(current.has(item.id) ? [] : [[item.id, item]]);
      const next = new Map(current);
      if (next.has(item.id)) next.delete(item.id);
      else next.set(item.id, item);
      return next;
    });

  const close = (value: boolean) => {
    if (!value) {
      setSelected(new Map());
      uploader.clear();
    }
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{m.picker.title}</DialogTitle>
          <DialogDescription className="sr-only">{m.picker.select}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder={m.searchPlaceholder}
            aria-label={labels.common.search}
          />
          <input
            ref={input}
            type="file"
            multiple={multiple}
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const files = Array.from(e.currentTarget.files ?? []);
              e.currentTarget.value = "";
              void uploader.start(files);
            }}
          />
          <Button variant="outline" onClick={() => input.current?.click()} disabled={uploader.busy}>
            <UploadIcon aria-hidden="true" />
            {m.upload}
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <UploadProgress uploads={uploader.uploads} onClear={uploader.clear} labels={labels} />
          {error ? <p className="py-8 text-center text-sm text-destructive">{error}</p> : null}
          {!data && !error ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {Array.from({ length: 12 }, (_, i) => (
                <Skeleton key={i} className="aspect-square" />
              ))}
            </div>
          ) : null}
          {data && data.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {query ? m.noMatch : m.empty}
            </p>
          ) : null}
          {data && data.items.length > 0 ? (
            <ul
              className="grid grid-cols-3 gap-2 sm:grid-cols-6"
              role="listbox"
              aria-multiselectable={multiple}
              aria-label={m.picker.select}
            >
              {data.items.map((item) => {
                const isSelected = selected.has(item.id);
                return (
                  <li key={item.id} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => toggle(item)}
                      title={item.originalName}
                      className={cn(
                        "relative block w-full overflow-hidden rounded-md border-2 border-transparent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                        isSelected && "border-primary",
                      )}
                    >
                      <MediaThumb media={item} sizes="(min-width: 640px) 120px, 33vw" />
                      {isSelected ? (
                        <span className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <CheckIcon className="size-3.5" aria-hidden="true" />
                        </span>
                      ) : null}
                      <span className="sr-only">{item.altText || item.originalName}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!data || data.page <= 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label={labels.common.back}
            >
              <ChevronLeftIcon aria-hidden="true" />
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums">
              {data ? `${data.page} / ${data.pageCount}` : ""}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!data || data.page >= data.pageCount}
              onClick={() => setPage((p) => p + 1)}
              aria-label="→"
            >
              <ChevronRightIcon aria-hidden="true" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => close(false)}>
              {labels.common.cancel}
            </Button>
            <Button
              disabled={selected.size === 0}
              onClick={() => {
                onSelect([...selected.values()]);
                close(false);
              }}
            >
              {multiple && selected.size > 0
                ? fmt(m.picker.chooseCount, { count: selected.size })
                : m.picker.choose}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
