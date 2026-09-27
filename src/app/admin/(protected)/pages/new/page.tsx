import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/page-header";
import { PageForm } from "@/components/admin/pages/page-form";
import { getAdminMessages } from "@/i18n/admin";
import { getAdminLocale } from "@/i18n/admin-locale";
import { hasPermission, requirePermission } from "@/lib/auth/session";
import { createPageAction } from "@/server/actions/pages";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getAdminMessages(await getAdminLocale()).pages.new };
}

export default async function NewPagePage() {
  const user = await requirePermission("pages.create");
  const t = getAdminMessages(await getAdminLocale());
  return (
    <>
      <AdminPageHeader title={t.pages.new} />
      <PageForm
        action={createPageAction}
        canPublish={hasPermission(user, "pages.publish")}
        labels={t}
      />
    </>
  );
}
