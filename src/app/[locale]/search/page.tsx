import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHero } from "@/components/site/page-hero";
import { Highlight, SearchForm } from "@/components/site/search-form";
import { isLocale, type Locale } from "@/config/i18n";
import { fmt } from "@/i18n/format";
import { getMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo/metadata";
import { SEARCH_MAX_LENGTH, type SearchHit, searchSite } from "@/server/public/content";
import { getSiteShell } from "@/server/public/site";
import { getEnabledLocales } from "@/server/services/site-settings";

/** Results depend on the query, so every request renders fresh. */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/search">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getMessages(locale).public.siteSearch;
  const shell = await getSiteShell(locale);
  return pageMetadata({
    enabledLocales: await getEnabledLocales(),
    locale,
    path: "/search",
    title: t.title,
    description: t.intro,
    siteName: shell.name,
    // Result pages are endless variations of one page: keep them out of search engines.
    noindex: true,
  });
}

const hitPath = (hit: SearchHit) =>
  ({
    project: `/projects/${hit.slug}`,
    service: `/services/${hit.slug}`,
    news: `/news/${hit.slug}`,
    page: `/${hit.slug}`,
  })[hit.type];

const order: SearchHit["type"][] = ["project", "service", "news", "page"];

export default async function SearchPage({ params, searchParams }: PageProps<"/[locale]/search">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getMessages(locale);
  const s = t.public.siteSearch;
  const raw = (await searchParams).q;
  const q = (typeof raw === "string" ? raw : "").trim().slice(0, SEARCH_MAX_LENGTH);
  const hits = q ? await searchSite(q, locale) : [];
  const path = (p: string) => localizedPath(locale as Locale, p) as Route;

  return (
    <>
      <PageHero
        title={s.title}
        intro={s.intro}
        crumbLabel={t.public.breadcrumb}
        crumbs={[{ href: path("/"), label: t.site.nav.home }, { label: s.title }]}
      >
        <SearchForm
          action={path("/search")}
          defaultValue={q}
          labels={s}
          size="lg"
          autoFocus={!q}
          className="mt-8 max-w-3xl"
        />
      </PageHero>

      <section className="container-site py-12 lg:py-16" aria-live="polite">
        {!q ? (
          <p className="max-w-2xl text-muted-foreground">{s.start}</p>
        ) : hits.length === 0 ? (
          <div className="max-w-2xl">
            <p className="text-lg font-medium">{fmt(s.none, { q })}</p>
            <p className="mt-2 text-muted-foreground">{s.noneHint}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {(
                [
                  ["/projects", t.site.nav.projects],
                  ["/services", t.site.nav.services],
                  ["/news", t.site.nav.news],
                  ["/contact", t.site.nav.contact],
                ] as const
              ).map(([href, label]) => (
                <li key={href}>
                  <Link
                    href={path(href)}
                    className="inline-block border px-4 py-2 text-sm font-medium transition-colors hover:border-primary"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <h2 className="mb-8 text-lg font-medium">
              {fmt(hits.length === 1 ? s.resultsOne : s.results, { count: hits.length, q })}
            </h2>
            <div className="grid max-w-3xl gap-10">
              {order.map((type) => {
                const group = hits.filter((h) => h.type === type);
                if (!group.length) return null;
                return (
                  <section key={type} aria-labelledby={`results-${type}`}>
                    <h3
                      id={`results-${type}`}
                      className="mb-3 flex items-center gap-3 text-sm font-semibold tracking-widest text-highlight-ink uppercase"
                    >
                      <span aria-hidden="true" className="h-px w-8 bg-highlight" />
                      {s.types[type]}
                    </h3>
                    <ul className="divide-y border-y">
                      {group.map((hit) => (
                        <li key={`${hit.type}-${hit.slug}`}>
                          <Link
                            href={path(hitPath(hit))}
                            className="group block py-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          >
                            <span className="text-lg type-heading group-hover:underline">
                              <Highlight text={hit.title} term={q} />
                            </span>
                            {hit.snippet ? (
                              <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">
                                <Highlight text={hit.snippet} term={q} />
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </section>
    </>
  );
}
