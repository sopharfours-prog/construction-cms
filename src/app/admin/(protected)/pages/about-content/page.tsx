import type { Metadata } from "next";

import { AboutEditor, type AboutItem } from "@/components/admin/about/about-editor";
import { AdminPageHeader } from "@/components/admin/page-header";
import { getAdminMessages } from "@/i18n/admin";
import { getAdminLocale } from "@/i18n/admin-locale";
import { hasPermission, requirePermission } from "@/lib/auth/session";
import { listAboutContent } from "@/server/services/about";
import { pickTranslation } from "@/server/services/content/translations";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getAdminMessages(await getAdminLocale()).about.title };
}

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function AboutContentPage() {
  const user = await requirePermission("pages.view");
  const locale = await getAdminLocale();
  const t = getAdminMessages(locale);
  const { team, certifications, milestones } = await listAboutContent();

  const teamItems: AboutItem[] = team.map((m) => {
    const tr = pickTranslation(m.translations, locale);
    return {
      id: m.id,
      status: m.status,
      label: tr?.name ?? "—",
      sub: tr?.position,
      translations: m.translations,
      image: m.photo,
    };
  });
  const certItems: AboutItem[] = certifications.map((c) => {
    const tr = pickTranslation(c.translations, locale);
    return {
      id: c.id,
      status: c.status,
      label: tr?.name ?? "—",
      sub: tr?.issuer ?? undefined,
      translations: c.translations,
      image: c.image,
      issuedAt: day(c.issuedAt),
      expiresAt: day(c.expiresAt),
    };
  });
  const milestoneItems: AboutItem[] = milestones.map((m) => {
    const tr = pickTranslation(m.translations, locale);
    return {
      id: m.id,
      status: m.status,
      label: `${m.year} · ${tr?.title ?? "—"}`,
      translations: m.translations,
      year: m.year,
    };
  });

  return (
    <>
      <AdminPageHeader title={t.about.title} description={t.about.description} />
      <AboutEditor
        team={teamItems}
        certifications={certItems}
        milestones={milestoneItems}
        canEdit={hasPermission(user, "pages.update")}
        canDelete={hasPermission(user, "pages.delete")}
        labels={t}
      />
    </>
  );
}
