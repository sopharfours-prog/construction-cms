import type { MetadataRoute } from "next";

import { defaultLocale, localeConfig } from "@/config/i18n";
import { localizedPath } from "@/i18n/routing";
import { db } from "@/lib/db/client";
import { absoluteUrl, isIndexingAllowed } from "@/lib/seo/metadata";
import { getEnabledLocales } from "@/server/services/site-settings";

/** Built per request (cached by the CDN), so `next build` needs no database. */
export const dynamic = "force-dynamic";

type Entry = {
  path: string;
  lastModified?: Date;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
};

/** Every public page in every language, each listing its alternates (hreflang). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isIndexingAllowed()) return [];
  const now = new Date();
  const locales = await getEnabledLocales();
  const [projects, services, news, pages] = await Promise.all([
    db.project.findMany({
      where: { deletedAt: null, status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
    db.service.findMany({
      where: { deletedAt: null, status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
    db.news.findMany({
      where: {
        deletedAt: null,
        status: { in: ["PUBLISHED", "SCHEDULED"] },
        publishedAt: { lte: now },
      },
      select: { slug: true, updatedAt: true },
    }),
    db.page.findMany({
      where: { deletedAt: null, status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const entries: Entry[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/projects", priority: 0.9, changeFrequency: "weekly" },
    { path: "/services", priority: 0.8, changeFrequency: "monthly" },
    { path: "/news", priority: 0.7, changeFrequency: "weekly" },
    { path: "/contact", priority: 0.6, changeFrequency: "yearly" },
    { path: "/request-quote", priority: 0.7, changeFrequency: "yearly" },
    ...projects.map((p) => ({
      path: `/projects/${p.slug}`,
      lastModified: p.updatedAt,
      priority: 0.8,
      changeFrequency: "monthly" as const,
    })),
    ...services.map((s) => ({
      path: `/services/${s.slug}`,
      lastModified: s.updatedAt,
      priority: 0.7,
      changeFrequency: "monthly" as const,
    })),
    ...news.map((n) => ({
      path: `/news/${n.slug}`,
      lastModified: n.updatedAt,
      priority: 0.6,
      changeFrequency: "yearly" as const,
    })),
    ...pages.map((p) => ({
      path: `/${p.slug}`,
      lastModified: p.updatedAt,
      priority: p.slug === "about" ? 0.7 : 0.3,
      changeFrequency: "yearly" as const,
    })),
  ];

  return entries.flatMap((entry) =>
    locales.map((locale) => ({
      url: absoluteUrl(localizedPath(locale, entry.path)),
      lastModified: entry.lastModified,
      changeFrequency: entry.changeFrequency,
      priority: locale === defaultLocale ? entry.priority : Math.round(entry.priority * 90) / 100,
      alternates: {
        languages: Object.fromEntries([
          ...locales.map((l) => [
            localeConfig[l].htmlLang,
            absoluteUrl(localizedPath(l, entry.path)),
          ]),
          ["x-default", absoluteUrl(localizedPath(defaultLocale, entry.path))],
        ]),
      },
    })),
  );
}
