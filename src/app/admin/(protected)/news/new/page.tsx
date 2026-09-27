import type { Metadata } from "next";

import { NewsForm } from "@/components/admin/news/news-form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { getAdminMessages } from "@/i18n/admin";
import { getAdminLocale } from "@/i18n/admin-locale";
import { hasPermission, requirePermission } from "@/lib/auth/session";
import { createNewsAction } from "@/server/actions/news";
import { getNewsFormOptions } from "@/server/services/news";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getAdminMessages(await getAdminLocale()).news.new };
}

export default async function NewNewsPage() {
  const user = await requirePermission("news.create");
  const locale = await getAdminLocale();
  const t = getAdminMessages(locale);
  return (
    <>
      <AdminPageHeader title={t.news.new} />
      <NewsForm
        action={createNewsAction}
        options={await getNewsFormOptions(locale)}
        canPublish={hasPermission(user, "news.publish")}
        labels={t}
      />
    </>
  );
}
