import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { fmt } from "@/i18n/format";
import type { Messages } from "@/i18n/messages";
import { cn } from "@/lib/utils";

/** Previous / next links that keep the current filters in the URL. */
export function PublicPagination({
  basePath,
  params,
  page,
  pages,
  t,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  pages: number;
  t: Messages["public"];
}) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, page: p > 1 ? String(p) : undefined }))
      if (v) q.set(k, v);
    const s = q.toString();
    return (s ? `${basePath}?${s}` : basePath) as Route;
  };
  const link =
    "flex items-center gap-1 border px-4 py-2 text-sm font-medium transition-colors hover:border-primary";
  return (
    <nav aria-label={t.pagination} className="mt-12 flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={link}>
          <ChevronLeftIcon className="size-4" aria-hidden="true" />
          {t.previous}
        </Link>
      ) : (
        <span />
      )}
      <p className="text-sm text-muted-foreground">{fmt(t.pageOf, { page, pages })}</p>
      {page < pages ? (
        <Link href={href(page + 1)} rel="next" className={cn(link)}>
          {t.next}
          <ChevronRightIcon className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
