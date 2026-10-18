import { UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { AdminPageHeader } from "@/components/admin/page-header";
import { PageForm } from "@/components/admin/pages/page-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isSystemPage } from "@/config/pages";
import { getAdminMessages } from "@/i18n/admin";
import { getAdminLocale } from "@/i18n/admin-locale";
import { hasPermission, requirePermission } from "@/lib/auth/session";
import { updatePageAction } from "@/server/actions/pages";
import { pickTranslation } from "@/server/services/content/translations";
import { getPageForEdit } from "@/server/services/pages";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getAdminMessages(await getAdminLocale()).pages.editTitle };
}

export default async function EditPagePage({ params }: PageProps<"/admin/pages/[id]">) {
  const user = await requirePermission("pages.update");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const locale = await getAdminLocale();
  const t = getAdminMessages(locale);
  const page = await getPageForEdit(id);
  if (!page) notFound();

  return (
    <>
      <AdminPageHeader
        title={pickTranslation(page.translations, locale)?.title ?? t.pages.editTitle}
        description={t.pages.editTitle}
      />
      {page.slug === "about" ? (
        <Alert className="mb-6">
          <UsersIcon aria-hidden="true" />
          <AlertDescription className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {t.about.pageHint}
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/pages/about-content">{t.about.open}</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      <PageForm
        action={updatePageAction.bind(null, page.id)}
        canPublish={hasPermission(user, "pages.publish")}
        labels={t}
        initial={{
          slug: page.slug,
          status: page.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
          system: isSystemPage(page.slug),
          coverImage: page.coverImage,
          translations: Object.fromEntries(
            page.translations.map((tr) => [
              tr.locale,
              {
                title: tr.title,
                content: tr.content,
                seoTitle: tr.seoTitle ?? "",
                seoDescription: tr.seoDescription ?? "",
              },
            ]),
          ),
        }}
      />
    </>
  );
}
