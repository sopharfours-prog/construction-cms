import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHero } from "@/components/site/page-hero";
import { RichText } from "@/components/site/rich-text";
import { isLocale } from "@/config/i18n";
import { getMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { formatDate } from "@/lib/format";
import { getPublicPage } from "@/server/public/content";
import { pageMetadata } from "@/lib/seo/metadata";
import { getEnabledLocales } from "@/server/services/site-settings";
import { getSiteShell } from "@/server/public/site";

type Props = PageProps<"/[locale]/[slug]">;

/** CMS pages such as privacy-policy and terms (dedicated routes like /projects take precedence). */
/** Rendered on first visit, then cached and refreshed when the CMS changes content. */
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const [page, shell] = await Promise.all([getPublicPage(slug, locale), getSiteShell(locale)]);
  if (!page) return {};
  return pageMetadata({
    enabledLocales: await getEnabledLocales(),
    locale,
    path: `/${page.slug}`,
    title: page.seo.title || page.title,
    description: page.seo.description,
    image: page.cover ?? shell.seo.ogImage,
    siteName: shell.name,
  });
}

export default async function CmsPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !/^[a-z0-9-]{1,200}$/.test(slug)) notFound();
  const page = await getPublicPage(slug, locale);
  if (!page) notFound();
  const t = getMessages(locale);
  return (
    <>
      <PageHero
        title={page.title}
        crumbLabel={t.public.breadcrumb}
        crumbs={[
          { href: localizedPath(locale, "/"), label: t.site.nav.home },
          { label: page.title },
        ]}
      />
      <div className="container-site max-w-3xl py-14 lg:py-20">
        <RichText doc={page.content} />
        <p className="mt-12 border-t pt-4 text-sm text-muted-foreground">
          <time dateTime={page.updatedAt.toISOString()}>{formatDate(page.updatedAt, locale)}</time>
        </p>
      </div>
    </>
  );
}
