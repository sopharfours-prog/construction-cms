import { NewspaperIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ListToolbar } from "@/components/admin/data/list-toolbar";
import { PaginationNav } from "@/components/admin/data/pagination-nav";
import { RowActions } from "@/components/admin/data/row-actions";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminContentSkeleton } from "@/components/admin/page-skeleton";
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
import type { Locale } from "@/config/i18n";
import { getAdminMessages } from "@/i18n/admin";
import { getAdminLocale } from "@/i18n/admin-locale";
import { type CurrentUser, hasPermission, requirePermission } from "@/lib/auth/session";
import { formatDateTime, formatNumber } from "@/lib/format";
import { deleteNewsAction, setNewsPublishedAction } from "@/server/actions/news";
import {
  getNewsFormOptions,
  listNews,
  type NewsListFilters,
  newsListSchema,
} from "@/server/services/news";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getAdminMessages(await getAdminLocale()).news.title };
}

const statusVariant = {
  DRAFT: "secondary",
  PUBLISHED: "default",
  SCHEDULED: "info",
  ARCHIVED: "outline",
} as const;

export default async function NewsPage({ searchParams }: PageProps<"/admin/news">) {
  const user = await requirePermission("news.view");
  const locale = await getAdminLocale();
  const t = getAdminMessages(locale);
  const filters = newsListSchema.parse(await searchParams);
  return (
    <>
      <AdminPageHeader
        title={t.news.title}
        description={t.news.description}
        actions={
          hasPermission(user, "news.create") ? (
            <Button asChild>
              <Link href="/admin/news/new">
                <PlusIcon aria-hidden="true" />
                {t.news.new}
              </Link>
            </Button>
          ) : null
        }
      />
      <Suspense key={JSON.stringify(filters)} fallback={<AdminContentSkeleton />}>
        <NewsList filters={filters} locale={locale} user={user} />
      </Suspense>
    </>
  );
}

async function NewsList({
  filters,
  locale,
  user,
}: {
  filters: NewsListFilters;
  locale: Locale;
  user: CurrentUser;
}) {
  const t = getAdminMessages(locale);
  const n = t.news;
  const [{ rows, total, page, pageCount }, options] = await Promise.all([
    listNews(filters, locale),
    getNewsFormOptions(locale),
  ]);
  const hasFilters = Boolean(filters.q || filters.status || filters.category);
  const canUpdate = hasPermission(user, "news.update");
  const canPublish = hasPermission(user, "news.publish");
  const canDelete = hasPermission(user, "news.delete");

  return (
    <>
      <ListToolbar
        basePath="/admin/news"
        hasFilters={hasFilters}
        labels={{ apply: t.common.filter, clear: t.common.clear }}
        search={{ value: filters.q, placeholder: n.searchPlaceholder, label: t.common.search }}
        selects={[
          {
            name: "status",
            label: n.columns.status,
            value: filters.status,
            allLabel: n.allStatuses,
            options: (["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"] as const).map((s) => ({
              value: s,
              label: t.common.contentStatus[s],
            })),
          },
          {
            name: "category",
            label: n.columns.category,
            value: filters.category,
            allLabel: n.allCategories,
            options: options.categories.map((c) => ({ value: c.id, label: c.name })),
          },
          {
            name: "sort",
            label: t.common.sort,
            value: filters.sort,
            options: [
              { value: "published", label: n.sortPublished },
              { value: "updated", label: n.sortUpdated },
            ],
          },
        ]}
      />
      {rows.length === 0 ? (
        <Empty className="border bg-background">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <NewspaperIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{hasFilters ? n.noMatch : n.empty}</EmptyTitle>
            {!hasFilters ? <EmptyDescription>{n.emptyHint}</EmptyDescription> : null}
          </EmptyHeader>
        </Empty>
      ) : (
        <Card className="py-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">{n.columns.article}</TableHead>
                    <TableHead className="hidden md:table-cell">{n.columns.category}</TableHead>
                    <TableHead>{n.columns.status}</TableHead>
                    <TableHead className="hidden sm:table-cell">{n.columns.date}</TableHead>
                    <TableHead className="hidden lg:table-cell">{n.columns.author}</TableHead>
                    <TableHead className="w-12 pr-4">
                      <span className="sr-only">{t.common.actions}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-80 pl-4">
                        {canUpdate ? (
                          <Link
                            href={`/admin/news/${row.id}`}
                            className="line-clamp-2 font-medium hover:underline"
                          >
                            {row.title}
                          </Link>
                        ) : (
                          <span className="line-clamp-2 font-medium">{row.title}</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{row.category ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[row.status]}>
                          {t.common.contentStatus[row.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-sm whitespace-nowrap text-muted-foreground sm:table-cell">
                        {row.publishedAt ? formatDateTime(row.publishedAt, locale) : n.notScheduled}
                      </TableCell>
                      <TableCell className="hidden text-sm lg:table-cell">
                        {row.author ?? "—"}
                      </TableCell>
                      <TableCell className="pr-4">
                        {canUpdate || canPublish || canDelete ? (
                          <RowActions
                            itemLabel={row.title}
                            labels={t.common}
                            editHref={canUpdate ? `/admin/news/${row.id}` : undefined}
                            published={row.status === "PUBLISHED"}
                            onPublish={
                              canPublish ? setNewsPublishedAction.bind(null, row.id) : undefined
                            }
                            onDelete={canDelete ? deleteNewsAction.bind(null, row.id) : undefined}
                          />
                        ) : null}
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
          basePath="/admin/news"
          params={{
            q: filters.q,
            status: filters.status,
            category: filters.category,
            sort: filters.sort === "published" ? undefined : filters.sort,
          }}
          page={page}
          pageCount={pageCount}
          total={total}
          labels={t.pagination}
          formatNumber={(x) => formatNumber(x, locale)}
        />
      ) : null}
    </>
  );
}
