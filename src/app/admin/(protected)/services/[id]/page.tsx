import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { AdminPageHeader } from "@/components/admin/page-header";
import { ServiceForm, type ServiceFormValues } from "@/components/admin/services/service-form";
import { getAdminMessages } from "@/i18n/admin";
import { getAdminLocale } from "@/i18n/admin-locale";
import { hasPermission, requirePermission } from "@/lib/auth/session";
import { updateServiceAction } from "@/server/actions/services";
import { pickTranslation } from "@/server/services/content/translations";
import { getServiceForEdit } from "@/server/services/services";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getAdminMessages(await getAdminLocale()).services.editTitle };
}

export default async function EditServicePage({ params }: PageProps<"/admin/services/[id]">) {
  const user = await requirePermission("services.update");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const locale = await getAdminLocale();
  const t = getAdminMessages(locale);
  const service = await getServiceForEdit(id);
  if (!service) notFound();

  const initial: ServiceFormValues = {
    slug: service.slug,
    icon: service.icon ?? "hard-hat",
    status: service.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
    translations: Object.fromEntries(
      service.translations.map((tr) => [
        tr.locale,
        {
          title: tr.title,
          description: tr.description ?? "",
          content: tr.content,
          process: Array.isArray(tr.process)
            ? (tr.process as { title: string; description: string }[])
            : [],
          seoTitle: tr.seoTitle ?? "",
          seoDescription: tr.seoDescription ?? "",
        },
      ]),
    ),
  };

  return (
    <>
      <AdminPageHeader
        title={pickTranslation(service.translations, locale)?.title ?? t.services.editTitle}
        description={t.services.editTitle}
      />
      <ServiceForm
        action={updateServiceAction.bind(null, service.id)}
        initial={initial}
        canPublish={hasPermission(user, "services.publish")}
        labels={t}
      />
    </>
  );
}
