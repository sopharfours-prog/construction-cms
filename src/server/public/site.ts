import "server-only";

import { cache } from "react";

import { defaultLocale, type Locale } from "@/config/i18n";
import { db } from "@/lib/db/client";
import { pickTranslation } from "@/server/services/content/translations";
import { getSetting } from "@/server/services/settings";

/** Localized text from a settings value, falling back to the default language. */
export const localized = (
  value: Partial<Record<Locale, string>> | undefined | null,
  locale: Locale,
) => value?.[locale] || value?.[defaultLocale] || "";

/** Company details shown in the header and footer of every public page. */
export const getSiteShell = cache(async (locale: Locale) => {
  const [general, contact, social, services] = await Promise.all([
    getSetting("general"),
    getSetting("contact"),
    getSetting("social"),
    db.service.findMany({
      where: { deletedAt: null, status: "PUBLISHED" },
      orderBy: { sortOrder: "asc" },
      take: 6,
      select: { slug: true, translations: { select: { locale: true, title: true } } },
    }),
  ]);
  const logo = general?.logoMediaId
    ? await db.media.findFirst({
        where: { id: general.logoMediaId, deletedAt: null },
        select: { url: true, width: true, height: true },
      })
    : null;

  return {
    name: localized(general?.siteName, locale),
    tagline: localized(general?.tagline, locale),
    description: localized(general?.description, locale),
    logo,
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
