import { ImagesIcon } from "lucide-react";
import type { Metadata } from "next";

import { ListToolbar } from "@/components/admin/data/list-toolbar";
import { PaginationNav } from "@/components/admin/data/pagination-nav";
import { FolderPanel } from "@/components/admin/media/folder-panel";
import { MediaLibrary } from "@/components/admin/media/media-library";
import { AdminPageHeader } from "@/components/admin/page-header";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getAdminMessages } from "@/i18n/admin";
import { getAdminLocale } from "@/i18n/admin-locale";
import { hasPermission, requirePermission } from "@/lib/auth/session";
import { formatNumber } from "@/lib/format";
import { listFolders, listMedia, mediaListSchema } from "@/server/services/media/media";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getAdminMessages(await getAdminLocale()).media.title };
}

export default async function MediaPage({ searchParams }: PageProps<"/admin/media">) {
  const user = await requirePermission("media.view");
  const locale = await getAdminLocale();
  const t = getAdminMessages(locale);
  const m = t.media;
  const filters = mediaListSchema.parse(await searchParams);
  const [{ items, total, page, pageCount }, folders] = await Promise.all([
    listMedia(filters),
    listFolders(),
  ]);
  const hasFilters = Boolean(filters.q || filters.kind);
  const can = {
    update: hasPermission(user, "media.update"),
    upload: hasPermission(user, "media.upload"),
    delete: hasPermission(user, "media.delete"),
  };
  const currentFolderId = filters.folder && filters.folder !== "none" ? filters.folder : null;

  return (
    <>
      <AdminPageHeader title={m.title} description={m.description} />
      <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
        <FolderPanel
          folders={folders.map((f) => ({ id: f.id, name: f.name, count: f._count.media }))}
          current={filters.folder}
          baseQuery={{ q: filters.q, kind: filters.kind }}
          can={{ create: can.upload, update: can.update, delete: can.delete }}
          labels={t}
        />
        <div className="min-w-0">
          <ListToolbar
            basePath={filters.folder ? `/admin/media?folder=${filters.folder}` : "/admin/media"}
            hasFilters={hasFilters}
            labels={{ apply: t.common.filter, clear: t.common.clear }}
            search={{ value: filters.q, placeholder: m.searchPlaceholder, label: t.common.search }}
            selects={[
              {
                name: "kind",
                label: m.meta.type,
                value: filters.kind,
                allLabel: m.allKinds,
                options: (["IMAGE", "VIDEO", "DOCUMENT"] as const).map((k) => ({
                  value: k,
                  label: m.kinds[k],
                })),
              },
            ]}
            hidden={filters.folder ? { folder: filters.folder } : undefined}
          />
          <MediaLibrary
            items={items}
            folders={folders.map((f) => ({ id: f.id, name: f.name }))}
            currentFolderId={currentFolderId}
            can={can}
            locale={locale}
            labels={t}
            empty={
              <Empty className="border bg-background">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ImagesIcon aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>{hasFilters ? m.noMatch : m.empty}</EmptyTitle>
                  {!hasFilters && can.upload ? (
                    <EmptyDescription>{m.emptyHint}</EmptyDescription>
                  ) : null}
                </EmptyHeader>
              </Empty>
            }
          />
          {total > 0 ? (
            <PaginationNav
              basePath="/admin/media"
              params={{ q: filters.q, kind: filters.kind, folder: filters.folder }}
              page={page}
              pageCount={pageCount}
              total={total}
              labels={t.pagination}
              formatNumber={(n) => formatNumber(n, locale)}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
