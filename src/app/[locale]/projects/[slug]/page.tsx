import { MapPinIcon } from "lucide-react";
import type { Metadata, Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ServiceIcon } from "@/components/shared/service-icon";
import { ProjectCard } from "@/components/site/cards";
import { CtaBand } from "@/components/site/cta-band";
import { Breadcrumbs, SectionHeading } from "@/components/site/page-hero";
import { ProjectGallery } from "@/components/site/project-gallery";
import { RichText } from "@/components/site/rich-text";
import { isLocale } from "@/config/i18n";
import { getMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { formatDate, formatNumber } from "@/lib/format";
import { getPublicProject } from "@/server/public/content";
import { pageMetadata } from "@/lib/seo/metadata";
import { getEnabledLocales } from "@/server/services/site-settings";
import { breadcrumbLd, JsonLd, projectLd } from "@/lib/seo/json-ld";
import { getSiteShell } from "@/server/public/site";
import { absoluteUrl } from "@/lib/seo/metadata";

type Props = PageProps<"/[locale]/projects/[slug]">;

/** Rendered on first visit, then cached and refreshed when the CMS changes content. */
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const [project, shell] = await Promise.all([
    getPublicProject(slug, locale),
    getSiteShell(locale),
  ]);
  if (!project) return {};
  return pageMetadata({
    enabledLocales: await getEnabledLocales(),
    locale,
    path: `/projects/${project.slug}`,
    title: project.seo.title || project.title,
    description: project.seo.description || project.summary,
    image: project.cover ?? project.gallery[0] ?? shell.seo.ogImage,
    siteName: shell.name,
  });
}

export default async function ProjectPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const project = await getPublicProject(slug, locale);
  if (!project) notFound();
  const t = getMessages(locale);
  const p = t.public.projects;
  const f = p.fields;

  const facts: [string, string | null][] = [
    [f.client, project.client],
    [f.location, project.location],
    [f.category, project.category?.name ?? null],
    [f.status, p.statuses[project.status]],
    [f.startDate, project.startDate ? formatDate(project.startDate, locale) : null],
    [f.completionDate, project.completionDate ? formatDate(project.completionDate, locale) : null],
    [
      f.contractValue,
      project.budget
        ? `${formatNumber(Number(project.budget.amount), locale)} ${project.budget.currency}`
        : null,
    ],
    [f.architect, project.architect],
    [f.contractor, project.contractor],
    [f.projectManager, project.projectManager],
  ];

  const pageUrl = localizedPath(locale, `/projects/${project.slug}`);
  return (
    <article>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: t.site.nav.home, path: localizedPath(locale, "/") },
            { name: p.title, path: localizedPath(locale, "/projects") },
            { name: project.title, path: pageUrl },
          ]),
          projectLd({
            url: absoluteUrl(pageUrl),
            name: project.title,
            description: project.summary,
            image: project.cover?.url ?? project.gallery[0]?.url,
            location: project.location,
            startDate: project.startDate,
            endDate: project.completionDate,
            orgUrl: absoluteUrl(localizedPath(locale, "/")),
            locale,
          }),
        ]}
      />
      <header className="relative isolate flex min-h-[60svh] items-end overflow-hidden bg-primary text-primary-foreground">
        {project.cover ? (
          <Image
            src={project.cover.url}
            alt={project.cover.altText || project.title}
            fill
            priority
            sizes="100vw"
            placeholder={project.cover.blurDataUrl ? "blur" : "empty"}
            blurDataURL={project.cover.blurDataUrl ?? undefined}
            className="-z-10 object-cover"
          />
        ) : null}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-t from-primary via-primary/75 to-primary/20"
        />
        <div className="container-site w-full pt-28 pb-12 lg:pb-16">
          <Breadcrumbs
            label={t.public.breadcrumb}
            className="mb-8 text-primary-foreground/80"
            items={[
              { href: localizedPath(locale, "/"), label: t.site.nav.home },
              { href: localizedPath(locale, "/projects"), label: p.title },
              { label: project.title },
            ]}
          />
          <p className="mb-3 text-sm font-semibold tracking-widest text-highlight uppercase">
            {[project.category?.name, p.statuses[project.status]].filter(Boolean).join(" · ")}
          </p>
          <h1 className="max-w-5xl text-4xl type-display text-balance sm:text-5xl lg:text-7xl">
            {project.title}
          </h1>
          {project.location ? (
            <p className="mt-5 flex items-center gap-2 text-lg text-primary-foreground/85">
              <MapPinIcon className="size-5" aria-hidden="true" />
              {project.location}
            </p>
          ) : null}
        </div>
      </header>

      <div className="container-site grid gap-12 py-14 lg:grid-cols-[1fr_22rem] lg:py-20">
        <div className="min-w-0">
          <h2 className="mb-6 text-2xl type-heading">{p.overview}</h2>
          {project.summary ? (
            <p className="mb-8 text-xl leading-relaxed text-foreground">{project.summary}</p>
          ) : null}
          <RichText doc={project.description} />

          {project.specifications.length ? (
            <section className="mt-14" aria-labelledby="specs-title">
              <h2 id="specs-title" className="mb-5 text-2xl type-heading">
                {p.specifications}
              </h2>
              <dl className="grid border-t sm:grid-cols-2">
                {project.specifications.map((spec) => (
                  <div
                    key={spec.label}
                    className="flex justify-between gap-4 border-b py-3 sm:odd:mr-4 sm:even:ml-4"
                  >
                    <dt className="text-muted-foreground">{spec.label}</dt>
                    <dd className="text-right font-semibold">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </div>

        <aside aria-labelledby="facts-title" className="lg:sticky lg:top-28 lg:self-start">
          <div className="border-t-4 border-highlight bg-muted/60 p-6">
            <h2 id="facts-title" className="mb-4 text-lg type-heading">
              {p.details}
            </h2>
            <dl className="grid gap-4 text-sm">
              {facts
                .filter((fact): fact is [string, string] => Boolean(fact[1]))
                .map(([label, value]) => (
                  <div key={label} className="grid gap-0.5">
                    <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      {label}
                    </dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
            </dl>
            {project.services.length ? (
              <div className="mt-6 border-t pt-5">
                <h3 className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {p.services}
                </h3>
                <ul className="grid gap-2">
                  {project.services.map((s) => (
                    <li key={s.slug}>
                      <Link
                        href={localizedPath(locale, `/services/${s.slug}`) as Route}
                        className="flex items-center gap-2 text-sm font-medium hover:text-primary hover:underline"
                      >
                        <ServiceIcon name={s.icon} className="size-4 text-highlight" />
                        {s.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      {project.gallery.length ? (
        <section className="container-site pb-16 lg:pb-24" aria-labelledby="gallery-title">
          <h2 id="gallery-title" className="mb-6 text-2xl type-heading">
            {p.gallery}
          </h2>
          <ProjectGallery items={project.gallery} title={project.title} t={t.public.gallery} />
        </section>
      ) : null}

      {project.related.length ? (
        <section className="bg-muted/50 py-16 lg:py-24" aria-labelledby="related-title">
          <div className="container-site">
            <SectionHeading title={p.related} id="related-title" />
            <div className="grid gap-6 md:grid-cols-3">
              {project.related.map((r) => (
                <ProjectCard key={r.slug} project={r} locale={locale} t={t.public} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <CtaBand
        title={t.public.home.ctaTitle}
        text={t.public.home.ctaText}
        primary={{
          href: localizedPath(locale, "/request-quote"),
          label: t.public.home.heroCtaQuote,
        }}
        secondary={{ href: localizedPath(locale, "/contact"), label: t.public.home.heroCtaContact }}
      />
    </article>
  );
}
