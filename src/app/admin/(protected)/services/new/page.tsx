import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/page-header";
import { ServiceForm } from "@/components/admin/services/service-form";
import { getAdminMessages } from "@/i18n/admin";
import { getAdminLocale } from "@/i18n/admin-locale";
import { hasPermission, requirePermission } from "@/lib/auth/session";
import { createServiceAction } from "@/server/actions/services";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getAdminMessages(await getAdminLocale()).services.new };
}

export default async function NewServicePage() {
  const user = await requirePermission("services.create");
  const t = getAdminMessages(await getAdminLocale());
  return (
    <>
      <AdminPageHeader title={t.services.new} />
      <ServiceForm
        action={createServiceAction}
        canPublish={hasPermission(user, "services.publish")}
        labels={t}
      />
    </>
  );
}
