import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RootDocument } from "@/components/shared/root-document";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { isLocale, localeConfig } from "@/config/i18n";
import { siteConfig } from "@/config/site";
import { sharedViewport } from "@/config/viewport";
import { getMessages } from "@/i18n/messages";
import { getSiteShell } from "@/server/public/site";

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
  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: name, template: `%s | ${name}` },
    description: shell.description || undefined,
    // Indexing is switched on with the SEO work (Phase 10).
    robots: { index: false, follow: false },
  };
}

export const viewport = sharedViewport;

export default async function SiteLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getMessages(locale);
  const shell = await getSiteShell(locale);

  return (
    <RootDocument lang={localeConfig[locale].htmlLang}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:shadow-lg"
      >
        {t.site.skipToContent}
      </a>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader locale={locale} shell={shell} t={t.site} />
        <main id="main" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <SiteFooter locale={locale} shell={shell} t={t.site} />
      </div>
    </RootDocument>
  );
}
