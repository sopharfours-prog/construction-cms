import { EyeIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/page-header";
import { SettingsForms, type SettingsValues } from "@/components/admin/settings/settings-forms";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { type SettingsSection, settingsSections } from "@/config/admin-nav";
import { defaultBrand } from "@/config/brand";
import { getAdminMessages } from "@/i18n/admin";
import { getAdminLocale } from "@/i18n/admin-locale";
import { hasPermission, requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { pickedMediaSelect } from "@/server/services/media/media";
import { getSetting } from "@/server/services/settings";
import { listLanguages } from "@/server/services/site-settings";

const isSection = (value: string): value is SettingsSection =>
  (settingsSections as readonly string[]).includes(value);

export async function generateMetadata({
  params,
}: PageProps<"/admin/settings/[section]">): Promise<Metadata> {
  const { section } = await params;
  const t = getAdminMessages(await getAdminLocale()).settings;
  return { title: isSection(section) ? `${t.tabs[section]} · ${t.title}` : t.title };
}

/** One Website Settings section, chosen in the sidebar's Settings sub-menu. */
export default async function SettingsSectionPage({
  params,
}: PageProps<"/admin/settings/[section]">) {
  const user = await requirePermission("settings.view");
  const { section } = await params;
  if (!isSection(section)) notFound();
  const t = getAdminMessages(await getAdminLocale());
  const [general, contact, social, seo, appearance, statistics, languages] = await Promise.all([
    getSetting("general"),
    getSetting("contact"),
    getSetting("social"),
    getSetting("seo"),
    getSetting("appearance"),
    getSetting("statistics"),
    listLanguages(),
  ]);
  const mediaIds = [
    general?.logoMediaId,
    general?.faviconMediaId,
    general?.heroImageMediaId,
    general?.aboutImageMediaId,
    seo?.ogImageMediaId,
  ].filter((id): id is string => Boolean(id));
  const media = new Map(
    (
      await db.media.findMany({
        where: { id: { in: mediaIds }, deletedAt: null },
        select: pickedMediaSelect,
      })
    ).map((m) => [m.id, m]),
  );
  const pick = (id: string | null | undefined) => (id ? (media.get(id) ?? null) : null);

  const values: SettingsValues = {
    general: {
      siteName: general?.siteName ?? {},
      tagline: general?.tagline ?? {},
      description: general?.description ?? {},
      logo: pick(general?.logoMediaId),
      favicon: pick(general?.faviconMediaId),
      heroImage: pick(general?.heroImageMediaId),
      aboutImage: pick(general?.aboutImageMediaId),
      foundedYear: general?.foundedYear ?? null,
    },
    contact: {
      address: contact?.address ?? {},
      phones: contact?.phones ?? [],
      email: contact?.email ?? "",
      notificationEmail: contact?.notificationEmail ?? null,
      openingHours: contact?.openingHours ?? {},
      mapEmbedUrl: contact?.mapEmbedUrl ?? null,
    },
    social: {
      facebook: social?.facebook ?? null,
      instagram: social?.instagram ?? null,
      tiktok: social?.tiktok ?? null,
      youtube: social?.youtube ?? null,
      linkedin: social?.linkedin ?? null,
    },
    seo: {
      defaultTitle: seo?.defaultTitle ?? {},
      defaultDescription: seo?.defaultDescription ?? {},
      ogImage: pick(seo?.ogImageMediaId),
      googleAnalyticsId: seo?.googleAnalyticsId ?? null,
      googleSiteVerification: seo?.googleSiteVerification ?? null,
    },
    appearance: {
      brand: appearance?.brand ?? defaultBrand,
      defaultTheme: appearance?.defaultTheme ?? "light",
    },
    statistics: {
      yearsOfExperience: statistics?.yearsOfExperience ?? null,
      clients: statistics?.clients ?? null,
      teamMembers: statistics?.teamMembers ?? null,
    },
    languages,
  };
  const canEdit = hasPermission(user, "settings.update");

  return (
    <>
      <AdminPageHeader title={t.settings.tabs[section]} description={t.settings.title} />
      {!canEdit ? (
        <Alert className="mb-6">
          <EyeIcon aria-hidden="true" />
          <AlertDescription>{t.settings.readOnly}</AlertDescription>
        </Alert>
      ) : null}
      <SettingsForms section={section} values={values} canEdit={canEdit} labels={t} />
    </>
  );
}
