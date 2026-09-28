import { FileSpreadsheetIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PaginationNav } from "@/components/admin/data/pagination-nav";
import { AdminPageHeader } from "@/components/admin/page-header";
import { RequestListToolbar } from "@/components/admin/requests/request-list-toolbar";
import { StatusBadge } from "@/components/admin/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAdminMessages } from "@/i18n/admin";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requirePermission } from "@/lib/auth/session";
import { formatNumber, formatRelative } from "@/lib/format";
import { listAssignableStaff, quoteStatuses } from "@/server/services/requests/common";
import { listQuotes, quoteListSchema } from "@/server/services/requests/queries";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getAdminMessages(await getAdminLocale()).quotes.title };
}

export default async function QuotesPage({ searchParams }: PageProps<"/admin/quotes">) {
  const user = await requirePermission("quotes.view");
  const locale = await getAdminLocale();
  const t = getAdminMessages(locale);
  const r = t.requests;
  const q = t.quotes;
  const filters = quoteListSchema.parse(await searchParams);
  const [{ rows, total, page, pageCount }, staff] = await Promise.all([
    listQuotes(filters, user.id, locale),
    listAssignableStaff("quote"),
  ]);
  const filtered = Boolean(filters.q || filters.status || filters.assigned);

  return (
    <>
      <AdminPageHeader title={q.title} description={q.description} />
      <RequestListToolbar
        basePath="/admin/quotes"
        filters={filters}
        statuses={quoteStatuses.map((s) => ({ value: s, label: t.status.quote[s] }))}
        staff={staff}
        searchPlaceholder={r.searchQuotes}
        t={t}
      />
      {rows.length === 0 ? (
        <Empty className="border bg-background">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileSpreadsheetIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>
              {filtered ? r.noMatch : filters.view === "archived" ? r.emptyArchived : r.emptyActive}
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card className="py-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">{q.columns.reference}</TableHead>
                    <TableHead>{q.columns.customer}</TableHead>
                    <TableHead className="hidden md:table-cell">{q.columns.project}</TableHead>
                    <TableHead className="hidden text-right lg:table-cell">
                      {q.columns.budget}
                    </TableHead>
                    <TableHead>{r.columns.status}</TableHead>
                    <TableHead className="hidden xl:table-cell">{r.columns.assignee}</TableHead>
                    <TableHead className="hidden pr-4 sm:table-cell">
                      {r.columns.received}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={row.status === "NEW" ? "font-medium" : undefined}
                    >
                      <TableCell className="pl-4 font-mono text-sm whitespace-nowrap">
                        <Link href={`/admin/quotes/${row.id}`} className="hover:underline">
                          {row.referenceNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-48">
                        <p className="truncate">{row.customerName}</p>
                        {row.company ? (
                          <p className="truncate text-xs font-normal text-muted-foreground">
                            {row.company}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="hidden max-w-60 md:table-cell">
                        <p className="truncate">{row.projectType}</p>
                        <p className="truncate text-xs font-normal text-muted-foreground">
                          {row.location}
                        </p>
                      </TableCell>
                      <TableCell className="hidden text-right text-sm font-normal whitespace-nowrap tabular-nums lg:table-cell">
                        {row.budget
                          ? `${formatNumber(Number(row.budget), locale)} ${row.currency}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          kind="quote"
                          status={row.status}
                          label={t.status.quote[row.status]}
                        />
                      </TableCell>
                      <TableCell className="hidden text-sm font-normal xl:table-cell">
                        {row.assignedTo?.name ?? "—"}
                      </TableCell>
                      <TableCell className="hidden pr-4 text-sm font-normal whitespace-nowrap text-muted-foreground sm:table-cell">
                        {formatRelative(row.createdAt, locale)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      {total > 0 ? (
        <PaginationNav
          basePath="/admin/quotes"
          params={{
            q: filters.q,
            status: filters.status,
            assigned: filters.assigned,
            view: filters.view === "active" ? undefined : filters.view,
          }}
          page={page}
          pageCount={pageCount}
          total={total}
          labels={t.pagination}
          formatNumber={(n) => formatNumber(n, locale)}
        />
      ) : null}
    </>
  );
}
