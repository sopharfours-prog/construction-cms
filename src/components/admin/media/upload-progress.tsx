"use client";

import { CheckCircle2Icon, CircleAlertIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmt } from "@/i18n/format";
import type { AdminMessages } from "@/i18n/admin";

import type { UploadState } from "./use-uploader";

export function UploadProgress({
  uploads,
  onClear,
  labels,
}: {
  uploads: UploadState[];
  onClear: () => void;
  labels: Pick<AdminMessages, "media" | "common">;
}) {
  if (!uploads.length) return null;
  const finished = uploads.filter((u) => u.status === "done" || u.status === "error").length;
  const busy = finished < uploads.length;
  return (
    <div className="mb-4 rounded-lg border bg-card p-3" role="status" aria-live="polite">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {fmt(labels.media.uploading, { done: finished, total: uploads.length })}
        </p>
        {!busy ? (
          <Button variant="ghost" size="icon-sm" onClick={onClear} aria-label={labels.common.clear}>
            <XIcon aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      <ul className="grid gap-2">
        {uploads.map((u) => (
          <li key={u.key} className="grid gap-1">
            <div className="flex items-center gap-2 text-sm">
              {u.status === "done" ? (
                <CheckCircle2Icon className="size-4 text-success" aria-hidden="true" />
              ) : null}
              {u.status === "error" ? (
                <CircleAlertIcon className="size-4 text-destructive" aria-hidden="true" />
              ) : null}
              <span className="min-w-0 flex-1 truncate">{u.name}</span>
            </div>
            {u.status === "error" ? (
              <p className="text-xs text-destructive">{u.error}</p>
            ) : (
              <Progress
                value={Math.round(u.progress * 100)}
                className="h-1.5"
                aria-label={u.name}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
