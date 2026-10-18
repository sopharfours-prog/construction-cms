import { InboxIcon, MessageSquareReplyIcon, PaperclipIcon } from "lucide-react";
import type { Metadata } from "next";

import { PaginationNav } from "@/components/admin/data/pagination-nav";
import { RowAction, RowCoverLink, rowLinkClass } from "@/components/admin/data/row-link";
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
import { cn } from "@/lib/utils";
import { inquiryStatuses, listAssignableStaff } from "@/server/services/requests/common";
import { inquiryListSchema, listInquiries } from "@/server/services/requests/queries";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getAdminMessages(await getAdminLocale()).inquiries.title };
}

export default async function InquiriesPage({ searchParams }: PageProps<"/admin/inquiries">) {
  const user = await requirePermission("inquiries.view");
  const locale = await getAdminLocale();
  const t = getAdminMessages(locale);
  const r = t.requests;
  const filters = inquiryListSchema.parse(await searchParams);
  const [{ rows, total, page, pageCount }, staff] = await Promise.all([
    listInquiries(filters, user.id),
    listAssignableStaff("inquiry"),
  ]);
  const filtered = Boolean(filters.q || filters.status || filters.assigned);

  return (
    <>
      <AdminPageHeader title={t.inquiries.title} description={t.inquiries.description} />
      <RequestListToolbar
        basePath="/admin/inquiries"
        filters={filters}
        statuses={inquiryStatuses.map((s) => ({ value: s, label: t.status.inquiry[s] }))}
        staff={staff}
        searchPlaceholder={r.searchInquiries}
        t={t}
      />
      {rows.length === 0 ? (
        <Empty className="border bg-background">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <InboxIcon aria-hidden="true" />
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
                    <TableHead className="pl-4">{r.columns.from}</TableHead>
                    <TableHead>{r.columns.subject}</TableHead>
                    <TableHead>{r.columns.status}</TableHead>
                    <TableHead className="hidden md:table-cell">{r.columns.assignee}</TableHead>
                    <TableHead className="hidden sm:table-cell">{r.columns.received}</TableHead>
                    <TableHead className="pr-4">
                      <span className="sr-only">{r.respond}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={cn(
                        rowLinkClass,
                        row.status === "NEW" && "font-medium",
                        // Unread: light blue until someone on staff opens it.
                        !row.staffReadAt &&
                          "bg-info/10 hover:bg-info/15 dark:bg-info/15 dark:hover:bg-info/20",
                      )}
                    >
                      <TableCell className="max-w-56 pl-4">
                        <RowCoverLink
                          href={`/admin/inquiries/${row.id}`}
                          accessible={false}
                          className="block truncate"
                        >
                          {row.name}
                        </RowCoverLink>
                        <p className="truncate text-xs font-normal text-muted-foreground">
                          {row.company ?? row.email}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-72">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate">{row.subject}</span>
                          {row._count.attachments ? (
                            <PaperclipIcon
                              className="size-3.5 shrink-0 text-muted-foreground"
                              aria-label={r.attachments}
                            />
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          kind="inquiry"
                          status={row.status}
                          label={t.status.inquiry[row.status]}
                        />
                      </TableCell>
                      <TableCell className="hidden text-sm font-normal md:table-cell">
                        {row.assignedTo?.name ?? "—"}
                      </TableCell>
                      <TableCell className="hidden text-sm font-normal whitespace-nowrap text-muted-foreground sm:table-cell">
                        {formatRelative(row.createdAt, locale)}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <RowAction
                          href={`/admin/inquiries/${row.id}`}
                          label={r.respond}
                          name={`${r.respond}: ${row.name}${row.status === "NEW" ? ` (${t.status.inquiry.NEW})` : ""}`}
                          icon={MessageSquareReplyIcon}
                          urgent={row.status === "NEW"}
                        />
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
          basePath="/admin/inquiries"
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
