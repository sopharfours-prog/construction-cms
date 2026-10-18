import { MessageSquareReplyIcon, MessagesSquareIcon } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { AutoRefresh } from "@/components/admin/data/auto-refresh";
import { PaginationNav } from "@/components/admin/data/pagination-nav";
import { RowAction, RowCoverLink, rowLinkClass } from "@/components/admin/data/row-link";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
import { chatListSchema, listConversations } from "@/server/services/chat";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getAdminMessages(await getAdminLocale()).chats.title };
}

/** Conversations from the website's chat bubble: open ones first, newest activity first. */
export default async function ChatsPage({ searchParams }: PageProps<"/admin/chats">) {
  await requirePermission("chats.view");
  const locale = await getAdminLocale();
  const t = getAdminMessages(locale);
  const ch = t.chats;
  const filters = chatListSchema.parse(await searchParams);
  const { rows, total, page, pageCount } = await listConversations(filters);
  const tabs = [
    { value: undefined, label: ch.filters.all },
    { value: "OPEN", label: ch.filters.open },
    { value: "CLOSED", label: ch.filters.closed },
  ] as const;

  return (
    <>
      <AdminPageHeader title={ch.title} description={ch.description} />
      {/* New chats and messages appear without a reload. */}
      <AutoRefresh intervalMs={10_000} />
      <nav aria-label={ch.filters.label} className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = filters.status === tab.value;
          return (
            <Button key={tab.label} asChild size="sm" variant={active ? "secondary" : "ghost"}>
              <Link
                href={(tab.value ? `/admin/chats?status=${tab.value}` : "/admin/chats") as Route}
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
              </Link>
            </Button>
          );
        })}
      </nav>
      {rows.length === 0 ? (
        <Empty className="border bg-background">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessagesSquareIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{filters.status ? ch.noMatch : ch.empty}</EmptyTitle>
            {filters.status ? null : <EmptyDescription>{ch.emptyHint}</EmptyDescription>}
          </EmptyHeader>
        </Empty>
      ) : (
        <Card className="py-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">{ch.columns.visitor}</TableHead>
                    <TableHead>{ch.columns.lastMessage}</TableHead>
                    <TableHead>{ch.columns.status}</TableHead>
                    <TableHead className="hidden md:table-cell">{ch.columns.assignee}</TableHead>
                    <TableHead className="hidden sm:table-cell">{ch.columns.updated}</TableHead>
                    <TableHead className="pr-4">
                      <span className="sr-only">{ch.reply}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    // The whole row opens the conversation (mouse and touch); the Reply
                    // button is the one link for keyboard and screen-reader users.
                    <TableRow
                      key={row.id}
                      className={cn(
                        rowLinkClass,
                        // Unread: light blue until someone on staff opens the chat.
                        row.unread &&
                          "bg-info/10 font-medium hover:bg-info/15 dark:bg-info/15 dark:hover:bg-info/20",
                      )}
                    >
                      <TableCell className="max-w-56 pl-4">
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              row.unread ? "bg-info" : "bg-transparent",
                            )}
                          />
                          <RowCoverLink
                            href={`/admin/chats/${row.id}`}
                            accessible={false}
                            className="block truncate"
                          >
                            {row.visitorName}
                          </RowCoverLink>
                        </span>
                        <p className="truncate pl-4 text-xs font-normal text-muted-foreground">
                          {row.visitorContact}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-80">
                        <span className="block truncate">
                          {row.lastMessage?.sender === "STAFF" ? (
                            <span className="font-normal text-muted-foreground">
                              {ch.youPrefix}{" "}
                            </span>
                          ) : null}
                          {row.lastMessage?.body ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.status === "OPEN" ? "info" : "secondary"}>
                          {ch.status[row.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-sm font-normal md:table-cell">
                        {row.assignedTo?.name ?? "—"}
                      </TableCell>
                      <TableCell className="hidden text-sm font-normal whitespace-nowrap text-muted-foreground sm:table-cell">
                        {formatRelative(row.lastMessageAt, locale)}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <RowAction
                          href={`/admin/chats/${row.id}`}
                          label={ch.reply}
                          name={`${ch.reply}: ${row.visitorName}${row.unread ? ` (${ch.unread})` : ""}`}
                          icon={MessageSquareReplyIcon}
                          urgent={row.unread}
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
          basePath="/admin/chats"
          params={{ status: filters.status }}
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
