import type { Metadata } from "next";

import { defaultLocale, localeConfig, locales, type Locale } from "@/config/i18n";
import { siteConfig } from "@/config/site";
import { localizedPath } from "@/i18n/routing";

/** Search engines may index the site only when explicitly enabled (production). */
export function isIndexingAllowed(): boolean {
  return process.env.ALLOW_INDEXING === "true";
}

export const absoluteUrl = (path: string) => new URL(path, siteConfig.url).toString();

export type SeoImage =
  | { url: string; width?: number | null; height?: number | null; altText?: string | null }
  | null
  | undefined;

type PageSeo = {
  locale: Locale;
  /** Path without the language prefix, e.g. "/projects/bridge". */
  path: string;
  title: string;
  description?: string | null;
  image?: SeoImage;
  type?: "website" | "article";
  publishedTime?: Date | null;
  modifiedTime?: Date | null;
  siteName?: string;
  noindex?: boolean;
  /** Use the title as-is, without the "| Site name" template (home page). */
  absoluteTitle?: boolean;
};

/**
 * Canonical URL, hreflang alternates (every language + x-default), Open Graph
 * and Twitter card for a public page. Content is one slug for all languages,
 * so alternates are the same path under each language.
 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
  image,
  type = "website",
  publishedTime,
  modifiedTime,
  siteName,
  noindex,
  absoluteTitle,
}: PageSeo): Metadata {
  const url = absoluteUrl(localizedPath(locale, path));
  const languages = Object.fromEntries([
    ...locales.map((l) => [localeConfig[l].htmlLang, absoluteUrl(localizedPath(l, path))]),
    ["x-default", absoluteUrl(localizedPath(defaultLocale, path))],
  ]);
  const images = image?.url
    ? [
        {
          url: absoluteUrl(image.url),
          width: image.width ?? undefined,
          height: image.height ?? undefined,
          alt: image.altText || title,
        },
      ]
    : undefined;
  const desc = description || undefined;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: desc,
    alternates: { canonical: url, languages },
    openGraph: {
      type,
      url,
      title,
      description: desc,
      siteName,
      locale: localeConfig[locale].ogLocale,
      alternateLocale: locales.filter((l) => l !== locale).map((l) => localeConfig[l].ogLocale),
      images,
      ...(type === "article"
        ? { publishedTime: publishedTime?.toISOString(), modifiedTime: modifiedTime?.toISOString() }
        : {}),
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title,
      description: desc,
      images: images?.map((i) => i.url),
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
