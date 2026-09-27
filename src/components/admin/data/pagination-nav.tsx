import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { fmt } from "@/i18n/format";
import { buildQuery } from "@/lib/admin/list-params";

type PaginationNavProps = {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  pageCount: number;
  total: number;
  labels: { label: string; previous: string; next: string; pageOf: string; results: string };
  formatNumber: (n: number) => string;
};

/** Server-rendered pagination: plain links, keeps the current filters. */
export function PaginationNav({
  basePath,
  params,
  page,
  pageCount,
  total,
  labels,
  formatNumber,
}: PaginationNavProps) {
  const href = (p: number) =>
    `${basePath}${buildQuery({ ...params, page: p > 1 ? p : undefined })}` as Route;

  return (
    <nav
      aria-label={labels.label}
      className="flex flex-col items-center justify-between gap-3 pt-4 sm:flex-row"
    >
      <p className="text-sm text-muted-foreground">
        {fmt(labels.results, { count: formatNumber(total) })}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={href(page - 1)} rel="prev">
              <ChevronLeftIcon aria-hidden="true" />
              {labels.previous}
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeftIcon aria-hidden="true" />
            {labels.previous}
          </Button>
        )}
        <span className="px-2 text-sm tabular-nums" aria-current="page">
          {fmt(labels.pageOf, { page: formatNumber(page), total: formatNumber(pageCount) })}
        </span>
        {page < pageCount ? (
          <Button asChild variant="outline" size="sm">
            <Link href={href(page + 1)} rel="next">
              {labels.next}
              <ChevronRightIcon aria-hidden="true" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            {labels.next}
            <ChevronRightIcon aria-hidden="true" />
          </Button>
        )}
      </div>
    </nav>
  );
}
