import { DownloadIcon, FileIcon, MailIcon, PhoneIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/config/i18n";
import type { AdminMessages } from "@/i18n/admin";
import { formatBytes, formatDateTime } from "@/lib/format";

type R = AdminMessages["requests"];

export function AttachmentList({
  base,
  attachments,
  locale,
  labels,
}: {
  base: string;
  attachments: { id: string; originalName: string; size: number }[];
  locale: Locale;
  labels: R;
}) {
  if (!attachments.length)
    return <p className="text-sm text-muted-foreground">{labels.noAttachments}</p>;
  return (
    <ul className="grid gap-2">
      {attachments.map((a) => (
        <li key={a.id} className="flex items-center gap-3 rounded-md border p-2">
          <FileIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{a.originalName}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(a.size, locale)}</p>
          </div>
          <Button asChild variant="ghost" size="icon-sm">
            {/* Plain link: authorized route handler, served as a download. */}
            <a
              href={`${base}/attachments/${a.id}`}
              download
              aria-label={`${labels.download}: ${a.originalName}`}
            >
              <DownloadIcon aria-hidden="true" />
            </a>
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function NoteTimeline({
  notes,
  locale,
  labels,
}: {
  notes: { id: string; body: string; createdAt: Date; author: { name: string } | null }[];
  locale: Locale;
  labels: R;
}) {
  if (!notes.length) return <p className="text-sm text-muted-foreground">{labels.noNotes}</p>;
  return (
    <ol className="grid gap-3">
      {notes.map((n) => (
        <li key={n.id} className="rounded-md bg-muted/60 p-3">
          <p className="mb-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{n.author?.name ?? "—"}</span> ·{" "}
            <time dateTime={n.createdAt.toISOString()}>{formatDateTime(n.createdAt, locale)}</time>
          </p>
          <p className="text-sm break-words whitespace-pre-wrap">{n.body}</p>
        </li>
      ))}
    </ol>
  );
}

export function ContactLinks({
  email,
  phone,
  labels,
}: {
  email: string;
  phone: string | null;
  labels: R;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" size="sm">
        <a href={`mailto:${encodeURIComponent(email)}`}>
          <MailIcon aria-hidden="true" />
          {labels.email}
        </a>
      </Button>
      {phone ? (
        <Button asChild variant="outline" size="sm">
          <a href={`tel:${phone.replace(/[^+0-9]/g, "")}`}>
            <PhoneIcon aria-hidden="true" />
            {labels.call}
          </a>
        </Button>
      ) : null}
    </div>
  );
}

/** Two-column definition list for request details. */
export function Details({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[10rem_1fr]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="break-words">{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
