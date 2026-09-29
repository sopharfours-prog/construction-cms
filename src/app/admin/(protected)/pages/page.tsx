import { FileTextIcon, LockIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { RowActions } from "@/components/admin/data/row-actions";
import { AdminPageHeader } from "@/components/admin/page-header";
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
import { formatRelative } from "@/lib/format";
import { deletePageAction, setPagePublishedAction } from "@/server/actions/pages";
import { listPages } from "@/server/services/pages";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getAdminMessages(await getAdminLocale()).pages.title };
}

export default async function PagesPage() {
  const user = await requirePermission("pages.view");
  const locale = await getAdminLocale();
  const t = getAdminMessages(locale);
  const p = t.pages;
  const pages = await listPages(locale);
  const canUpdate = hasPermission(user, "pages.update");
  const canPublish = hasPermission(user, "pages.publish");
  const canDelete = hasPermission(user, "pages.delete");

  return (
    <>
      <AdminPageHeader
        title={p.title}
        description={p.description}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/pages/about-content">{t.about.open}</Link>
            </Button>
            {hasPermission(user, "pages.create") ? (
              <Button asChild>
                <Link href="/admin/pages/new">
                  <PlusIcon aria-hidden="true" />
                  {p.new}
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />
      {pages.length === 0 ? (
        <Empty className="border bg-background">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileTextIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{p.empty}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card className="py-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">{p.columns.page}</TableHead>
                    <TableHead className="hidden sm:table-cell">{p.columns.address}</TableHead>
                    <TableHead>{p.columns.status}</TableHead>
                    <TableHead className="hidden md:table-cell">{p.columns.updated}</TableHead>
                    <TableHead className="w-12 pr-4">
                      <span className="sr-only">{t.common.actions}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pages.map((page) => (
                    <TableRow key={page.id}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-1.5">
                          {canUpdate ? (
                            <Link
                              href={`/admin/pages/${page.id}`}
                              className="font-medium hover:underline"
                            >
                              {page.title}
                            </Link>
                          ) : (
                            <span className="font-medium">{page.title}</span>
                          )}
                          {page.system ? (
                            <LockIcon
                              className="size-3.5 text-muted-foreground"
                              aria-label={p.system}
                            />
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="hidden font-mono text-sm text-muted-foreground sm:table-cell">
                        /{page.slug}
                      </TableCell>
                      <TableCell>
                        <Badge variant={page.status === "PUBLISHED" ? "default" : "secondary"}>
                          {t.common.contentStatus[page.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {formatRelative(page.updatedAt, locale)}
                      </TableCell>
                      <TableCell className="pr-4">
                        <RowActions
                          itemLabel={page.title}
                          labels={t.common}
                          editHref={canUpdate ? `/admin/pages/${page.id}` : undefined}
                          published={page.status === "PUBLISHED"}
                          onPublish={
                            canPublish ? setPagePublishedAction.bind(null, page.id) : undefined
                          }
                          onDelete={
                            canDelete && !page.system
                              ? deletePageAction.bind(null, page.id)
                              : undefined
                          }
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
    </>
  );
}
