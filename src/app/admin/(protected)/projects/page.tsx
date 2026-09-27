import { HardHatIcon, PlusIcon, StarIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ListToolbar } from "@/components/admin/data/list-toolbar";
import { PaginationNav } from "@/components/admin/data/pagination-nav";
import { RowActions } from "@/components/admin/data/row-actions";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminContentSkeleton } from "@/components/admin/page-skeleton";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
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
import { formatNumber, formatRelative } from "@/lib/format";
import { deleteProjectAction, setProjectPublishedAction } from "@/server/actions/projects";
import {
  getProjectFormOptions,
  listProjects,
  type ProjectListFilters,
  projectListSchema,
} from "@/server/services/projects";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getAdminMessages(await getAdminLocale()).projects.title };
}

export default async function ProjectsPage({ searchParams }: PageProps<"/admin/projects">) {
  const user = await requirePermission("projects.view");
  const locale = await getAdminLocale();
  const t = getAdminMessages(locale);
  const filters = projectListSchema.parse(await searchParams);

  return (
    <>
      <AdminPageHeader
        title={t.projects.title}
        description={t.projects.description}
        actions={
          hasPermission(user, "projects.create") ? (
            <Button asChild>
              <Link href="/admin/projects/new">
                <PlusIcon aria-hidden="true" />
                {t.projects.new}
              </Link>
            </Button>
          ) : null
        }
      />
      <Suspense key={JSON.stringify(filters)} fallback={<AdminContentSkeleton />}>
        <ProjectList filters={filters} locale={locale} user={user} />
      </Suspense>
    </>
  );
}

async function ProjectList({
  filters,
  locale,
  user,
}: {
  filters: ProjectListFilters;
  locale: Locale;
  user: CurrentUser;
}) {
  const t = getAdminMessages(locale);
  const p = t.projects;
  const [{ rows, total, page, pageCount }, options] = await Promise.all([
    listProjects(filters, locale),
    getProjectFormOptions(locale),
  ]);
  const hasFilters = Boolean(
    filters.q || filters.status || filters.projectStatus || filters.category || filters.year,
  );
  const canUpdate = hasPermission(user, "projects.update");
  const canPublish = hasPermission(user, "projects.publish");
  const canDelete = hasPermission(user, "projects.delete");

  return (
    <>
      <ListToolbar
        basePath="/admin/projects"
        hasFilters={hasFilters}
        labels={{ apply: t.common.filter, clear: t.common.clear }}
        search={{ value: filters.q, placeholder: p.searchPlaceholder, label: t.common.search }}
        selects={[
          {
            name: "status",
            label: p.columns.status,
            value: filters.status,
            allLabel: p.allStatuses,
            options: (["DRAFT", "PUBLISHED"] as const).map((s) => ({
              value: s,
              label: t.common.contentStatus[s],
            })),
          },
          {
            name: "projectStatus",
            label: p.columns.stage,
            value: filters.projectStatus,
            allLabel: p.allProjectStatuses,
            options: (["UPCOMING", "ONGOING", "COMPLETED"] as const).map((s) => ({
              value: s,
              label: t.status.project[s],
            })),
          },
          {
            name: "category",
            label: p.columns.category,
            value: filters.category,
            allLabel: p.allCategories,
            options: options.categories.map((c) => ({ value: c.id, label: c.name })),
          },
          {
            name: "year",
            label: p.columns.year,
            value: filters.year ? String(filters.year) : undefined,
            allLabel: p.allYears,
            options: options.years.map((y) => ({ value: String(y), label: String(y) })),
          },
          {
            name: "sort",
            label: t.common.sort,
            value: filters.sort,
            options: [
              { value: "updated", label: p.sortUpdated },
              { value: "created", label: p.sortCreated },
              { value: "completion", label: p.sortCompletion },
              { value: "order", label: p.sortOrder },
            ],
          },
        ]}
      />

      {rows.length === 0 ? (
        <Empty className="border bg-background">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HardHatIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{hasFilters ? p.noMatch : p.empty}</EmptyTitle>
            {!hasFilters ? <EmptyDescription>{p.emptyHint}</EmptyDescription> : null}
          </EmptyHeader>
          {!hasFilters && hasPermission(user, "projects.create") ? (
            <EmptyContent>
              <Button asChild size="sm">
                <Link href="/admin/projects/new">
                  <PlusIcon aria-hidden="true" />
                  {p.new}
                </Link>
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      ) : (
        <Card className="py-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">{p.columns.project}</TableHead>
                    <TableHead className="hidden md:table-cell">{p.columns.category}</TableHead>
                    <TableHead>{p.columns.stage}</TableHead>
                    <TableHead className="hidden sm:table-cell">{p.columns.year}</TableHead>
                    <TableHead>{p.columns.status}</TableHead>
                    <TableHead className="hidden lg:table-cell">{p.columns.updated}</TableHead>
                    <TableHead className="w-12 pr-4">
                      <span className="sr-only">{t.common.actions}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-72 pl-4">
                        <div className="flex items-center gap-1.5">
                          {canUpdate ? (
                            <Link
                              href={`/admin/projects/${row.id}`}
                              className="truncate font-medium hover:underline"
                            >
                              {row.title}
                            </Link>
                          ) : (
                            <span className="truncate font-medium">{row.title}</span>
                          )}
                          {row.featured ? (
                            <StarIcon
                              className="size-3.5 shrink-0 fill-highlight text-highlight"
                              aria-label={p.featured}
                            />
                          ) : null}
                        </div>
                        {row.location ? (
                          <p className="truncate text-xs text-muted-foreground">{row.location}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{row.category ?? "—"}</TableCell>
                      <TableCell>
                        <StatusBadge
                          kind="project"
                          status={row.projectStatus}
                          label={t.status.project[row.projectStatus]}
                        />
                      </TableCell>
                      <TableCell className="hidden tabular-nums sm:table-cell">
                        {row.year ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.status === "PUBLISHED" ? "default" : "secondary"}>
                          {t.common.contentStatus[row.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-sm whitespace-nowrap text-muted-foreground lg:table-cell">
                        {formatRelative(row.updatedAt, locale)}
                      </TableCell>
                      <TableCell className="pr-4">
                        {canUpdate || canPublish || canDelete ? (
                          <RowActions
                            itemLabel={row.title}
                            labels={t.common}
                            editHref={canUpdate ? `/admin/projects/${row.id}` : undefined}
                            published={row.status === "PUBLISHED"}
                            onPublish={
                              canPublish ? setProjectPublishedAction.bind(null, row.id) : undefined
                            }
                            onDelete={
                              canDelete ? deleteProjectAction.bind(null, row.id) : undefined
                            }
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
          basePath="/admin/projects"
          params={{
            q: filters.q,
            status: filters.status,
            projectStatus: filters.projectStatus,
            category: filters.category,
            year: filters.year ? String(filters.year) : undefined,
            sort: filters.sort === "updated" ? undefined : filters.sort,
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
