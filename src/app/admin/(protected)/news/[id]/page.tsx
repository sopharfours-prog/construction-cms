import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { NewsForm, type NewsFormValues } from "@/components/admin/news/news-form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { getAdminMessages } from "@/i18n/admin";
import { getAdminLocale } from "@/i18n/admin-locale";
import { hasPermission, requirePermission } from "@/lib/auth/session";
import { toVientianeInput } from "@/lib/format";
import { updateNewsAction } from "@/server/actions/news";
import { pickTranslation } from "@/server/services/content/translations";
import { getNewsForEdit, getNewsFormOptions } from "@/server/services/news";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getAdminMessages(await getAdminLocale()).news.editTitle };
}

export default async function EditNewsPage({ params }: PageProps<"/admin/news/[id]">) {
  const user = await requirePermission("news.update");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const locale = await getAdminLocale();
  const t = getAdminMessages(locale);
  const [news, options] = await Promise.all([getNewsForEdit(id), getNewsFormOptions(locale)]);
  if (!news) notFound();

  const initial: NewsFormValues = {
    slug: news.slug,
    categoryId: news.categoryId ?? "",
    status: news.status,
    publishedAt: toVientianeInput(news.publishedAt),
    tagIds: news.tags.map((x) => x.tagId),
    coverImage: news.coverImage,
    seoImage: news.seoImage,
    translations: Object.fromEntries(
      news.translations.map((tr) => [
        tr.locale,
        {
          title: tr.title,
          excerpt: tr.excerpt ?? "",
          content: tr.content,
          seoTitle: tr.seoTitle ?? "",
          seoDescription: tr.seoDescription ?? "",
        },
      ]),
    ),
  };

  return (
    <>
      <AdminPageHeader
        title={pickTranslation(news.translations, locale)?.title ?? t.news.editTitle}
        description={t.news.editTitle}
      />
      <NewsForm
        action={updateNewsAction.bind(null, news.id)}
        initial={initial}
        options={options}
        canPublish={hasPermission(user, "news.publish")}
        labels={t}
      />
    </>
  );
}
