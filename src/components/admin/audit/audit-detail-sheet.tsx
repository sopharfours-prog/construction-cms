"use client";

import { EyeIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export type AuditDetail = {
  title: string;
  subtitle: string;
  userAgent: string | null;
  oldValue: unknown;
  newValue: unknown;
};

type Labels = {
  details: string;
  before: string;
  after: string;
  noSnapshot: string;
  userAgent: string;
};

function Snapshot({ label, value, empty }: { label: string; value: unknown; empty: string }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">{label}</h3>
      {value === null || value === undefined ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <pre className="max-h-80 overflow-auto rounded-md border bg-muted/50 p-3 text-xs leading-relaxed">
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </section>
  );
}

/** Side panel with the full before/after snapshots of one audit entry. */
export function AuditDetailSheet({ detail, labels }: { detail: AuditDetail; labels: Labels }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`${labels.details}: ${detail.title}`}>
          <EyeIcon aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{detail.title}</SheetTitle>
          <SheetDescription>{detail.subtitle}</SheetDescription>
        </SheetHeader>
        <div className="grid gap-6 px-4 pb-6">
          <Snapshot label={labels.before} value={detail.oldValue} empty={labels.noSnapshot} />
          <Snapshot label={labels.after} value={detail.newValue} empty={labels.noSnapshot} />
          {detail.userAgent ? (
            <section>
              <h3 className="mb-2 text-sm font-semibold">{labels.userAgent}</h3>
              <p className="text-xs break-all text-muted-foreground">{detail.userAgent}</p>
            </section>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
