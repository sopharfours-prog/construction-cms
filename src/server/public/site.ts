import "server-only";

import { cache } from "react";

import { defaultLocale, type Locale } from "@/config/i18n";
import { db } from "@/lib/db/client";
import { getServerEnv } from "@/lib/env/server";
import { pickTranslation } from "@/server/services/content/translations";
import { getSetting } from "@/server/services/settings";

/** Localized text from a settings value, falling back to the default language. */
export const localized = (
  value: Partial<Record<Locale, string>> | undefined | null,
  locale: Locale,
) => value?.[locale] || value?.[defaultLocale] || "";

/** Company details shown in the header and footer of every public page. */
export const getSiteShell = cache(async (locale: Locale) => {
  const [general, contact, social, seo, services] = await Promise.all([
    getSetting("general"),
    getSetting("contact"),
    getSetting("social"),
    getSetting("seo"),
    db.service.findMany({
      where: { deletedAt: null, status: "PUBLISHED" },
      orderBy: { sortOrder: "asc" },
      take: 6,
      select: { slug: true, translations: { select: { locale: true, title: true } } },
    }),
  ]);
  const mediaSelect = { url: true, width: true, height: true, altText: true } as const;
  const [logo, ogImage] = await Promise.all([
    general?.logoMediaId
      ? db.media.findFirst({
          where: { id: general.logoMediaId, deletedAt: null },
          select: mediaSelect,
        })
      : null,
    seo?.ogImageMediaId
      ? db.media.findFirst({
          where: { id: seo.ogImageMediaId, deletedAt: null, kind: "IMAGE" },
          select: mediaSelect,
        })
      : null,
  ]);

  return {
    name: localized(general?.siteName, locale),
    tagline: localized(general?.tagline, locale),
    description: localized(general?.description, locale),
    logo,
    foundedYear: general?.foundedYear ?? null,
    seo: {
      title: localized(seo?.defaultTitle, locale),
      description: localized(seo?.defaultDescription, locale),
      ogImage,
      // Settings win; GOOGLE_ANALYTICS_ID (validated as G-XXXX) covers a fresh install.
      googleAnalyticsId: seo?.googleAnalyticsId ?? getServerEnv().GOOGLE_ANALYTICS_ID ?? null,
      googleSiteVerification: seo?.googleSiteVerification ?? null,
    },
    contact: {
      address: localized(contact?.address, locale),
      phones: contact?.phones ?? [],
      email: contact?.email ?? null,
      openingHours: localized(contact?.openingHours, locale),
    },
    social: Object.entries(social ?? {}).filter((entry): entry is [string, string] =>
      Boolean(entry[1]),
    ),
    services: services.map((s) => ({
      slug: s.slug,
      title: pickTranslation(s.translations, locale)?.title ?? s.slug,
    })),
  };
});

export type SiteShell = Awaited<ReturnType<typeof getSiteShell>>;
