import type { Metadata } from "next";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import { RootDocument } from "@/components/shared/root-document";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { defaultLocale, isLocale, localeConfig } from "@/config/i18n";
import { siteConfig } from "@/config/site";
import { sharedViewport } from "@/config/viewport";
import { getMessages } from "@/i18n/messages";
import { absoluteUrl, isIndexingAllowed } from "@/lib/seo/metadata";
import { JsonLd, organizationLd } from "@/lib/seo/json-ld";
import { getSiteShell } from "@/server/public/site";
import { getSetting } from "@/server/services/settings";
import { getEnabledLocales } from "@/server/services/site-settings";
import { GoogleAnalytics } from "@/components/site/analytics";
import { localizedPath } from "@/i18n/routing";

import "../globals.css";

/**
 * No paths at build time: every page renders on its first visit and is then
 * cached (ISR). So `next build` needs no database, and CMS changes
 * revalidate the cached pages.
 */
export async function generateStaticParams() {
  return [];
}

export const revalidate = 300;

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const shell = await getSiteShell(locale);
  const name = shell.name || siteConfig.fallbackName;
  const indexable = isIndexingAllowed();
  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: shell.seo.title || name, template: `%s | ${name}` },
    description: shell.seo.description || shell.description || undefined,
    applicationName: name,
    robots: indexable
      ? {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true, "max-image-preview": "large" },
        }
      : { index: false, follow: false },
    verification: shell.seo.googleSiteVerification
      ? { google: shell.seo.googleSiteVerification }
      : undefined,
    openGraph: {
      siteName: name,
      type: "website",
      locale: localeConfig[locale].ogLocale,
      images: shell.seo.ogImage
        ? [
            {
              url: absoluteUrl(shell.seo.ogImage.url),
              width: shell.seo.ogImage.width ?? undefined,
              height: shell.seo.ogImage.height ?? undefined,
            },
          ]
        : undefined,
    },
    twitter: { card: shell.seo.ogImage ? "summary_large_image" : "summary" },
    formatDetection: { telephone: false },
  };
}

export const viewport = sharedViewport;

export default async function SiteLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getMessages(locale);
  const [shell, appearance, enabledLocales] = await Promise.all([
    getSiteShell(locale),
    getSetting("appearance"),
    getEnabledLocales(),
  ]);
  // A language switched off in Website Settings sends visitors to the main language.
  if (!enabledLocales.includes(locale)) redirect(localizedPath(defaultLocale, "/") as Route);

  return (
    <RootDocument
      lang={localeConfig[locale].htmlLang}
      brand={appearance?.brand}
      defaultTheme={appearance?.defaultTheme}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:shadow-lg"
      >
        {t.site.skipToContent}
      </a>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader locale={locale} shell={shell} t={t.site} languages={enabledLocales} />
        <main id="main" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <SiteFooter locale={locale} shell={shell} t={t.site} />
      </div>
      <JsonLd
        data={organizationLd({
          name: shell.name || siteConfig.fallbackName,
          description: shell.description,
          url: absoluteUrl(localizedPath(locale, "/")),
          logo: shell.logo?.url,
          email: shell.contact.email,
          phones: shell.contact.phones,
          address: shell.contact.address,
          sameAs: shell.social.map(([, url]) => url),
          foundingYear: shell.foundedYear,
        })}
      />
      <GoogleAnalytics id={shell.seo.googleAnalyticsId} />
    </RootDocument>
  );
}
