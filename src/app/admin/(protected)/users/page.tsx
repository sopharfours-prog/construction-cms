import { PlusIcon, ShieldIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ListToolbar } from "@/components/admin/data/list-toolbar";
import { PaginationNav } from "@/components/admin/data/pagination-nav";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { hasPermission, requirePermission } from "@/lib/auth/session";
import { formatDate, formatNumber, formatRelative } from "@/lib/format";
import { listRoles, listUsers, userListSchema } from "@/server/services/users";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getAdminMessages(await getAdminLocale()).users.title };
}

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const user = await requirePermission("users.view");
  const locale = await getAdminLocale();
  const t = getAdminMessages(locale);
  const u = t.users;
  const filters = userListSchema.parse(await searchParams);
  const [{ rows, total, page, pageCount }, roles] = await Promise.all([
    listUsers(filters),
    listRoles(),
  ]);
  const now = new Date();

  return (
    <>
      <AdminPageHeader
        title={u.title}
        description={u.description}
        actions={
          <div className="flex gap-2">
            {hasPermission(user, "roles.manage") ? (
              <Button asChild variant="outline">
                <Link href="/admin/roles">
                  <ShieldIcon aria-hidden="true" />
                  {t.roles.title}
                </Link>
              </Button>
            ) : null}
            {hasPermission(user, "users.create") ? (
              <Button asChild>
                <Link href="/admin/users/new">
                  <PlusIcon aria-hidden="true" />
                  {u.new}
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />
      <ListToolbar
        basePath="/admin/users"
        hasFilters={Boolean(filters.q || filters.role || filters.status)}
        labels={{ apply: t.common.filter, clear: t.common.clear }}
        search={{ value: filters.q, placeholder: u.searchPlaceholder, label: t.common.search }}
        selects={[
          {
            name: "role",
            label: u.columns.role,
            value: filters.role,
            allLabel: u.allRoles,
            options: roles.map((r) => ({ value: r.id, label: r.name })),
          },
          {
            name: "status",
            label: u.columns.status,
            value: filters.status,
            allLabel: u.allStatuses,
            options: (["ACTIVE", "DISABLED"] as const).map((s) => ({
              value: s,
              label: u.status[s],
            })),
          },
        ]}
      />
      {rows.length === 0 ? (
        <Empty className="border bg-background">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{u.empty}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card className="py-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">{u.columns.user}</TableHead>
                    <TableHead>{u.columns.role}</TableHead>
                    <TableHead>{u.columns.status}</TableHead>
                    <TableHead className="hidden md:table-cell">{u.columns.lastLogin}</TableHead>
                    <TableHead className="hidden pr-4 lg:table-cell">{u.columns.created}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            {row.avatar ? <AvatarImage src={row.avatar.url} alt="" /> : null}
                            <AvatarFallback className="text-xs">
                              {row.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <Link
                              href={`/admin/users/${row.id}`}
                              className="block truncate font-medium hover:underline"
                            >
                              {row.name}
                              {row.id === user.id ? (
                                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                  ({u.you})
                                </span>
                              ) : null}
                            </Link>
                            <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{row.role.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant={row.status === "ACTIVE" ? "success" : "secondary"}>
                            {u.status[row.status]}
                          </Badge>
                          {row.lockedUntil && row.lockedUntil > now ? (
                            <Badge variant="warning">{u.locked}</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {row.lastLoginAt ? formatRelative(row.lastLoginAt, locale) : u.never}
                      </TableCell>
                      <TableCell className="hidden pr-4 text-sm text-muted-foreground lg:table-cell">
                        {formatDate(row.createdAt, locale)}
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
          basePath="/admin/users"
          params={{ q: filters.q, role: filters.role, status: filters.status }}
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
