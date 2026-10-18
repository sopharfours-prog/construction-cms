import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { NewsCard } from "@/components/site/cards";
import { PageHero } from "@/components/site/page-hero";
import { PublicPagination } from "@/components/site/public-pagination";
import { isLocale } from "@/config/i18n";
import { fmt } from "@/i18n/format";
import { getMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { listPublicNews, publicNewsFilters } from "@/server/public/content";
import { pageMetadata } from "@/lib/seo/metadata";
import { getEnabledLocales } from "@/server/services/site-settings";
import { getSiteShell } from "@/server/public/site";

/** Filters and pages come from the URL, so each request renders fresh (not a cached copy). */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/news">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getMessages(locale).public.news;
  const shell = await getSiteShell(locale);
  return pageMetadata({
    enabledLocales: await getEnabledLocales(),
    locale,
    path: "/news",
    title: t.title,
    description: t.intro,
    image: shell.seo.ogImage,
    siteName: shell.name,
  });
}

export default async function NewsPage({ params, searchParams }: PageProps<"/[locale]/news">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getMessages(locale);
  const n = t.public.news;
  const filters = publicNewsFilters.parse(await searchParams);
  const result = await listPublicNews(filters, locale);
  const base = localizedPath(locale, "/news");
  const chip = (active: boolean) =>
    cn(
      "border px-4 py-2 text-sm font-medium transition-colors hover:border-primary",
      active && "border-primary bg-primary text-primary-foreground",
    );

  return (
    <>
      <PageHero
        title={n.title}
        intro={result.tagName ? fmt(n.tagged, { tag: result.tagName }) : n.intro}
        crumbLabel={t.public.breadcrumb}
        crumbs={[{ href: localizedPath(locale, "/"), label: t.site.nav.home }, { label: n.title }]}
      />
      <section className="container-site py-12 lg:py-16" aria-label={n.title}>
        {result.categories.length ? (
          <nav aria-label={t.public.projects.category} className="mb-10 flex flex-wrap gap-2">
            <Link
              href={base as Route}
              className={chip(!filters.category)}
              aria-current={!filters.category ? "page" : undefined}
            >
              {n.allCategories}
            </Link>
            {result.categories.map((c) => (
              <Link
                key={c.slug}
                href={`${base}?category=${c.slug}` as Route}
                className={chip(filters.category === c.slug)}
                aria-current={filters.category === c.slug ? "page" : undefined}
              >
                {c.name}
              </Link>
            ))}
          </nav>
        ) : null}
        {result.items.length ? (
          <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((item) => (
              <NewsCard
                key={item.slug}
                news={item}
                locale={locale}
                t={t.public}
                headingLevel="h2"
              />
            ))}
          </div>
        ) : (
          <p className="border border-dashed py-20 text-center text-muted-foreground">{n.empty}</p>
        )}
        <PublicPagination
          basePath={base}
          params={{ category: filters.category, tag: filters.tag }}
          page={result.page}
          pages={result.pages}
          t={t.public}
        />
      </section>
    </>
  );
}
