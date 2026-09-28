"use client";

import { UploadIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/config/i18n";
import type { AdminMessages } from "@/i18n/admin";
import { cn } from "@/lib/utils";

import { MediaDetailSheet } from "./media-detail-sheet";
import { MediaThumb } from "./media-thumb";
import { ACCEPT_MEDIA, type UploadedMedia } from "./upload-client";
import { UploadProgress } from "./upload-progress";
import { useUploader } from "./use-uploader";

type Item = Omit<UploadedMedia, "createdAt"> & { createdAt: string | Date };

type Props = {
  items: Item[];
  folders: { id: string; name: string }[];
  currentFolderId: string | null;
  can: { update: boolean; upload: boolean; delete: boolean };
  locale: Locale;
  labels: Pick<AdminMessages, "common" | "validation" | "media">;
  empty: React.ReactNode;
};

/** Grid + drag-and-drop upload anywhere on the page + detail panel. */
export function MediaLibrary({
  items,
  folders,
  currentFolderId,
  can,
  locale,
  labels,
  empty,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const { uploads, busy, start, clear } = useUploader({
    folderId: currentFolderId,
    labels,
    onComplete: () => router.refresh(),
  });

  const hasFiles = (e: React.DragEvent) => e.dataTransfer.types.includes("Files");

  return (
    <div
      className="relative"
      onDragEnter={(e) => {
        if (!can.upload || !hasFiles(e)) return;
        depth.current += 1;
        setDragging(true);
      }}
      onDragOver={(e) => can.upload && hasFiles(e) && e.preventDefault()}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setDragging(false);
      }}
      onDrop={(e) => {
        if (!can.upload) return;
        e.preventDefault();
        depth.current = 0;
        setDragging(false);
        void start(Array.from(e.dataTransfer.files));
      }}
    >
      {can.upload ? (
        <div className="mb-4 flex flex-col gap-2 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center">
          <input
            ref={input}
            type="file"
            multiple
            accept={ACCEPT_MEDIA}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const files = Array.from(e.currentTarget.files ?? []);
              e.currentTarget.value = "";
              void start(files);
            }}
          />
          <Button onClick={() => input.current?.click()} disabled={busy} className="w-fit">
            <UploadIcon aria-hidden="true" />
            {labels.media.upload}
          </Button>
          <p className="text-xs text-muted-foreground">{labels.media.dropHint}</p>
        </div>
      ) : null}

      <UploadProgress uploads={uploads} onClear={clear} labels={labels} />

      {items.length === 0 ? (
        empty
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setSelected(item.id)}
                className="group block w-full overflow-hidden rounded-lg border bg-card text-left transition hover:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <MediaThumb
                  media={item}
                  sizes="(min-width: 1280px) 16vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
                />
                <span className="block truncate px-2 py-1.5 text-xs">{item.originalName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-primary/80 text-primary-foreground opacity-0 transition-opacity",
          dragging && "opacity-100",
        )}
      >
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-current px-10 py-8">
          <UploadIcon className="size-10" />
          <p className="text-lg font-semibold">{labels.media.dropHere}</p>
        </div>
      </div>

      <MediaDetailSheet
        mediaId={selected}
        onClose={() => setSelected(null)}
        folders={folders}
        can={can}
        locale={locale}
        labels={labels}
      />
    </div>
  );
}
