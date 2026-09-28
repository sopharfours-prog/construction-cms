"use client";

import type { AdminMessages } from "@/i18n/admin";

export type UploadedMedia = {
  id: string;
  kind: "IMAGE" | "VIDEO" | "DOCUMENT" | "OTHER";
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  caption: string | null;
  blurDataUrl: string | null;
  folderId: string | null;
  createdAt: string;
};

type ApiErrorBody = { error?: string; reason?: string };

/** Error body → message in the admin's language. */
export function describeApiError(
  body: ApiErrorBody | null,
  labels: Pick<AdminMessages, "common" | "validation">,
): string {
  const reason = body?.reason as keyof AdminMessages["validation"] | undefined;
  if (reason && reason in labels.validation) return labels.validation[reason];
  if (body?.error === "tooLarge") return labels.validation.fileTooLarge;
  if (body?.error === "rateLimited") return labels.validation.rateLimited;
  const code = body?.error as keyof AdminMessages["common"]["errors"] | undefined;
  return (code && labels.common.errors[code]) || labels.common.errors.unexpected;
}

/** XHR (not fetch) so upload progress can be shown. */
export function uploadWithProgress(
  url: string,
  file: File,
  fields: Record<string, string>,
  onProgress: (fraction: number) => void,
) {
  return new Promise<{ ok: true; body: UploadedMedia } | { ok: false; body: ApiErrorBody | null }>(
    (resolve) => {
      const form = new FormData();
      form.append("file", file);
      for (const [k, v] of Object.entries(fields)) form.append(k, v);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.responseType = "json";
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
      xhr.onload = () =>
        resolve(
          xhr.status >= 200 && xhr.status < 300
            ? { ok: true, body: xhr.response as UploadedMedia }
            : { ok: false, body: xhr.response as ApiErrorBody | null },
        );
      xhr.onerror = () => resolve({ ok: false, body: { error: "unexpected" } });
      xhr.send(form);
    },
  );
}

const MB = 1024 * 1024;
const clientLimits: [RegExp, number][] = [
  [/^image\/(jpeg|png|webp|avif)$/, 20 * MB],
  [/^video\/(mp4|webm)$/, 100 * MB],
  [
    /^application\/(pdf|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet))$/,
    20 * MB,
  ],
];

/** Quick pre-check for a friendly early message. The server re-checks by content. */
export function precheck(file: File): "fileType" | "fileTooLarge" | "fileEmpty" | null {
  if (file.size === 0) return "fileEmpty";
  const rule = clientLimits.find(([pattern]) => pattern.test(file.type));
  if (!rule) return file.type ? "fileType" : null; // unknown browser type: let the server decide
  return file.size > rule[1] ? "fileTooLarge" : null;
}

export const ACCEPT_MEDIA =
  "image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,application/pdf,.docx,.xlsx";
