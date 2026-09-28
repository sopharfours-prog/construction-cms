"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import type { AdminMessages } from "@/i18n/admin";
import { fmt } from "@/i18n/format";

import {
  describeApiError,
  precheck,
  type UploadedMedia,
  uploadWithProgress,
} from "./upload-client";

export type UploadState = {
  key: string;
  name: string;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
};

const CONCURRENCY = 3;

export function useUploader(options: {
  folderId?: string | null;
  labels: Pick<AdminMessages, "common" | "validation" | "media">;
  onComplete?: (items: UploadedMedia[]) => void;
}) {
  const { folderId, labels, onComplete } = options;
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const busy = uploads.some((u) => u.status === "queued" || u.status === "uploading");

  const start = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      const batch = files.map((file, i) => ({ file, key: `${Date.now()}-${i}-${file.name}` }));
      setUploads(
        batch.map(({ file, key }) => ({ key, name: file.name, progress: 0, status: "queued" })),
      );
      const update = (key: string, patch: Partial<UploadState>) =>
        setUploads((list) => list.map((u) => (u.key === key ? { ...u, ...patch } : u)));

      const done: UploadedMedia[] = [];
      const queue = [...batch];
      const worker = async () => {
        for (let next = queue.shift(); next; next = queue.shift()) {
          const { file, key } = next;
          const early = precheck(file);
          if (early) {
            update(key, { status: "error", error: labels.validation[early] });
            continue;
          }
          update(key, { status: "uploading" });
          const result = await uploadWithProgress(
            "/api/media",
            file,
            folderId ? { folderId } : {},
            (progress) => update(key, { progress }),
          );
          if (result.ok) {
            done.push(result.body);
            update(key, { status: "done", progress: 1 });
          } else {
            update(key, { status: "error", error: describeApiError(result.body, labels) });
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batch.length) }, worker));

      const failed = batch.length - done.length;
      if (done.length) toast.success(fmt(labels.media.uploaded, { count: done.length }));
      if (failed) toast.error(labels.common.errors.validation);
      else setTimeout(() => setUploads([]), 1500);
      onComplete?.(done);
    },
    [folderId, labels, onComplete],
  );

  return { uploads, busy, start, clear: () => setUploads([]) };
}
