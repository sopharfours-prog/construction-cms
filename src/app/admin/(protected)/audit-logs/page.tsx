import { ScrollTextIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuditDetailSheet } from "@/components/admin/audit/audit-detail-sheet";
import { PaginationNav } from "@/components/admin/data/pagination-nav";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AuditAction } from "@/generated/prisma/enums";
import { getAdminMessages } from "@/i18n/admin";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requirePermission } from "@/lib/auth/session";
import type { AuditFilters } from "@/server/services/audit-log-query";
import type { Locale } from "@/config/i18n";
import { formatDateTime, formatNumber } from "@/lib/format";
import {
  auditFiltersSchema,
  getAuditFilterOptions,
  listAuditLogs,
} from "@/server/services/audit-log-query";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getAdminMessages(await getAdminLocale()).audit.title };
}

const failureActions = new Set<string>(["LOGIN_FAILED", "DELETE", "PERMISSION_CHANGE"]);

export default async function AuditLogsPage({ searchParams }: PageProps<"/admin/audit-logs">) {
  await requirePermission("audit.view");
  const locale = await getAdminLocale();
  const t = getAdminMessages(locale);
  const a = t.audit;

  const filters = auditFiltersSchema.parse(await searchParams);

  return (
    <>
      <AdminPageHeader title={a.title} description={a.description} />
      <Suspense key={JSON.stringify(filters)} fallback={<AdminContentSkeleton />}>
        <AuditLogContent filters={filters} locale={locale} />
      </Suspense>
    </>
  );
}

async function AuditLogContent({ filters, locale }: { filters: AuditFilters; locale: Locale }) {
  const t = getAdminMessages(locale);
  const a = t.audit;
  const [{ rows, total, page, pageCount }, options] = await Promise.all([
    listAuditLogs(filters),
    getAuditFilterOptions(),
  ]);
  const hasFilters = Boolean(filters.q || filters.action || filters.entity || filters.user);
  const entityLabel = (e: string) => a.entities[e as keyof typeof a.entities] ?? e;

  return (
    <>
      <Card className="mb-6 py-4">
        <CardContent>
          <form
            method="get"
            role="search"
            aria-label={a.filters}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]"
          >
            <div className="grid gap-1.5">
              <Label htmlFor="audit-q" className="sr-only">
                {a.search}
              </Label>
              <Input
                id="audit-q"
                name="q"
                type="search"
                defaultValue={filters.q}
                placeholder={a.search}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="audit-action" className="sr-only">
                {a.action}
              </Label>
              <NativeSelect
                id="audit-action"
                name="action"
                defaultValue={filters.action ?? ""}
                className="w-full"
              >
                <NativeSelectOption value="">{a.allActions}</NativeSelectOption>
                {Object.values(AuditAction).map((action) => (
                  <NativeSelectOption key={action} value={action}>
                    {a.actions[action]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="audit-entity" className="sr-only">
                {a.record}
              </Label>
              <NativeSelect
                id="audit-entity"
                name="entity"
                defaultValue={filters.entity ?? ""}
                className="w-full"
              >
                <NativeSelectOption value="">{a.allEntities}</NativeSelectOption>
                {options.entities.map((entity) => (
                  <NativeSelectOption key={entity} value={entity}>
                    {entityLabel(entity)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="audit-user" className="sr-only">
                {a.user}
              </Label>
              <NativeSelect
                id="audit-user"
                name="user"
                defaultValue={filters.user ?? ""}
                className="w-full"
              >
                <NativeSelectOption value="">{a.allUsers}</NativeSelectOption>
                {options.users.map((u) => (
                  <NativeSelectOption key={u.id} value={u.id}>
                    {u.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
              <Button type="submit" className="flex-1 lg:flex-none">
                {a.apply}
              </Button>
              {hasFilters ? (
                <Button asChild variant="ghost">
                  <Link href="/admin/audit-logs">{a.reset}</Link>
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <Empty className="border bg-background">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ScrollTextIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{a.empty}</EmptyTitle>
            {hasFilters ? <EmptyDescription>{a.emptyHint}</EmptyDescription> : null}
          </EmptyHeader>
        </Empty>
      ) : (
        <Card className="py-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">{a.time}</TableHead>
                    <TableHead>{a.user}</TableHead>
                    <TableHead>{a.action}</TableHead>
                    <TableHead>{a.record}</TableHead>
                    <TableHead className="hidden lg:table-cell">{a.ip}</TableHead>
                    <TableHead className="w-12 pr-4">
                      <span className="sr-only">{a.details}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const actor =
                      row.user?.name ??
                      (typeof row.newValue === "object" && row.newValue && "email" in row.newValue
                        ? String(row.newValue.email)
                        : a.system);
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="pl-4 whitespace-nowrap tabular-nums">
                          <time dateTime={row.createdAt.toISOString()}>
                            {formatDateTime(row.createdAt, locale)}
                          </time>
                        </TableCell>
                        <TableCell>
                          <p className="max-w-48 truncate font-medium">{actor}</p>
                          {row.user?.email ? (
                            <p className="max-w-48 truncate text-xs text-muted-foreground">
                              {row.user.email}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={failureActions.has(row.action) ? "destructive" : "secondary"}
                          >
                            {a.actions[row.action]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p>{entityLabel(row.entity)}</p>
                          {row.entityId ? (
                            <p className="font-mono text-xs text-muted-foreground">
                              {row.entityId.slice(0, 8)}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="hidden text-sm tabular-nums lg:table-cell">
                          {row.ipAddress ?? "—"}
                        </TableCell>
                        <TableCell className="pr-4">
                          <AuditDetailSheet
                            labels={a}
                            detail={{
                              title: `${a.actions[row.action]} · ${entityLabel(row.entity)}`,
                              subtitle: `${formatDateTime(row.createdAt, locale)} · ${actor}${row.ipAddress ? ` · ${row.ipAddress}` : ""}`,
                              userAgent: row.userAgent,
                              oldValue: row.oldValue,
                              newValue: row.newValue,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {total > 0 ? (
        <PaginationNav
          basePath="/admin/audit-logs"
          params={{
            q: filters.q,
            action: filters.action,
            entity: filters.entity,
            user: filters.user,
          }}
          page={page}
          pageCount={pageCount}
          total={total}
          labels={t.pagination}
          formatNumber={(value) => formatNumber(value, locale)}
        />
      ) : null}
    </>
  );
}
