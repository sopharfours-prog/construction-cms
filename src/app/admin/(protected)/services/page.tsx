import { PlusIcon, WrenchIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { RowActions } from "@/components/admin/data/row-actions";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ReorderButtons } from "@/components/admin/services/reorder-buttons";
import { ServiceIcon } from "@/components/shared/service-icon";
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
import { getAdminMessages } from "@/i18n/admin";
import { getAdminLocale } from "@/i18n/admin-locale";
import { fmt } from "@/i18n/format";
import { hasPermission, requirePermission } from "@/lib/auth/session";
import {
  deleteServiceAction,
  moveServiceAction,
  setServicePublishedAction,
} from "@/server/actions/services";
import { listServices } from "@/server/services/services";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getAdminMessages(await getAdminLocale()).services.title };
}

export default async function ServicesPage() {
  const user = await requirePermission("services.view");
  const locale = await getAdminLocale();
  const t = getAdminMessages(locale);
  const s = t.services;
  const services = await listServices(locale);
  const canCreate = hasPermission(user, "services.create");
  const canUpdate = hasPermission(user, "services.update");
  const canPublish = hasPermission(user, "services.publish");
  const canDelete = hasPermission(user, "services.delete");

  const newButton = canCreate ? (
    <Button asChild>
      <Link href="/admin/services/new">
        <PlusIcon aria-hidden="true" />
        {s.new}
      </Link>
    </Button>
  ) : null;

  return (
    <>
      <AdminPageHeader title={s.title} description={s.description} actions={newButton} />
      {services.length === 0 ? (
        <Empty className="border bg-background">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <WrenchIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{s.empty}</EmptyTitle>
            <EmptyDescription>{s.emptyHint}</EmptyDescription>
          </EmptyHeader>
          {newButton ? <EmptyContent>{newButton}</EmptyContent> : null}
        </Empty>
      ) : (
        <Card className="py-0">
          <CardContent className="p-0">
            <ol className="divide-y">
              {services.map((service, index) => (
                <li key={service.id} className="flex items-center gap-3 px-4 py-3">
                  {canUpdate ? (
                    <ReorderButtons
                      isFirst={index === 0}
                      isLast={index === services.length - 1}
                      onMove={moveServiceAction.bind(null, service.id)}
                      labels={t.common}
                      itemLabel={service.title}
                    />
                  ) : null}
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary">
                    <ServiceIcon name={service.icon} className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    {canUpdate ? (
                      <Link
                        href={`/admin/services/${service.id}`}
                        className="font-medium hover:underline"
                      >
                        {service.title}
                      </Link>
                    ) : (
                      <p className="font-medium">{service.title}</p>
                    )}
                    <p className="truncate text-sm text-muted-foreground">
                      {service.description ?? service.slug} ·{" "}
                      {fmt(s.projects, { count: service.projectCount })}
                    </p>
                  </div>
                  <Badge variant={service.status === "PUBLISHED" ? "default" : "secondary"}>
                    {t.common.contentStatus[service.status]}
                  </Badge>
                  {canUpdate || canPublish || canDelete ? (
                    <RowActions
                      itemLabel={service.title}
                      labels={t.common}
                      editHref={canUpdate ? `/admin/services/${service.id}` : undefined}
                      published={service.status === "PUBLISHED"}
                      onPublish={
                        canPublish ? setServicePublishedAction.bind(null, service.id) : undefined
                      }
                      onDelete={canDelete ? deleteServiceAction.bind(null, service.id) : undefined}
                    />
                  ) : null}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </>
  );
}
