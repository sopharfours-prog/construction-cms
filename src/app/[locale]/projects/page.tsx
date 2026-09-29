import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectCard } from "@/components/site/cards";
import { FilterBar } from "@/components/site/filter-bar";
import { PageHero } from "@/components/site/page-hero";
import { PublicPagination } from "@/components/site/public-pagination";
import { isLocale } from "@/config/i18n";
import { fmt } from "@/i18n/format";
import { getMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import {
  getProjectFilterOptions,
  listPublicProjects,
  publicProjectFilters,
} from "@/server/public/content";
import { pageMetadata } from "@/lib/seo/metadata";
import { getEnabledLocales } from "@/server/services/site-settings";
import { getSiteShell } from "@/server/public/site";

/** Filters and pages come from the URL, so each request renders fresh (not a cached copy). */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/projects">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getMessages(locale).public.projects;
  const shell = await getSiteShell(locale);
  return pageMetadata({
    enabledLocales: await getEnabledLocales(),
    locale,
    path: "/projects",
    title: t.title,
    description: t.intro,
    image: shell.seo.ogImage,
    siteName: shell.name,
  });
}

export default async function ProjectsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/projects">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getMessages(locale);
  const p = t.public.projects;
  const filters = publicProjectFilters.parse(await searchParams);
  const [result, options] = await Promise.all([
    listPublicProjects(filters, locale),
    getProjectFilterOptions(locale),
  ]);
  const base = localizedPath(locale, "/projects");
  const active = Boolean(filters.q || filters.category || filters.status || filters.year);

  return (
    <>
      <PageHero
        title={p.title}
        intro={p.intro}
        crumbLabel={t.public.breadcrumb}
        crumbs={[{ href: localizedPath(locale, "/"), label: t.site.nav.home }, { label: p.title }]}
      />
      <section className="container-site py-12 lg:py-16" aria-label={p.title}>
        <FilterBar
          action={base}
          active={active}
          labels={{ search: t.public.search, apply: t.public.apply, clear: t.public.clear }}
          search={{ value: filters.q, placeholder: p.searchPlaceholder }}
          selects={[
            {
              name: "category",
              label: p.category,
              value: filters.category,
              allLabel: p.allCategories,
              options: options.categories.map((c) => ({ value: c.slug, label: c.name })),
            },
            {
              name: "status",
              label: p.status,
              value: filters.status,
              allLabel: p.allStatuses,
              options: (["COMPLETED", "ONGOING", "UPCOMING"] as const).map((s) => ({
                value: s,
                label: p.statuses[s],
              })),
            },
            {
              name: "year",
              label: p.year,
              value: filters.year ? String(filters.year) : undefined,
              allLabel: p.allYears,
              options: options.years.map((y) => ({ value: String(y), label: String(y) })),
            },
          ]}
        />
        <p className="mt-8 mb-6 text-sm text-muted-foreground" aria-live="polite">
          {fmt(p.results, { count: result.total })}
        </p>
        {result.items.length ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {result.items.map((project, i) => (
              <ProjectCard
                key={project.slug}
                project={project}
                locale={locale}
                t={t.public}
                headingLevel="h2"
                priority={i < 3}
              />
            ))}
          </div>
        ) : (
          <p className="border border-dashed py-20 text-center text-muted-foreground">{p.empty}</p>
        )}
        <PublicPagination
          basePath={base}
          params={{
            q: filters.q,
            category: filters.category,
            status: filters.status,
            year: filters.year ? String(filters.year) : undefined,
          }}
          page={result.page}
          pages={result.pages}
          t={t.public}
        />
      </section>
    </>
  );
}
