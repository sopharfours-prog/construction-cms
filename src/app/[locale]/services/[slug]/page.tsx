import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ServiceIcon } from "@/components/shared/service-icon";
import { CoverImage, ProjectCard } from "@/components/site/cards";
import { CtaBand } from "@/components/site/cta-band";
import { PageHero, SectionHeading } from "@/components/site/page-hero";
import { RichText } from "@/components/site/rich-text";
import { isLocale } from "@/config/i18n";
import { getMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { getPublicService, listPublicServices } from "@/server/public/content";

type Props = PageProps<"/[locale]/services/[slug]">;

/** Rendered on first visit, then cached and refreshed when the CMS changes content. */
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const s = await getPublicService(slug, locale);
  if (!s) return {};
  return {
    title: s.seo.title || s.title,
    description: s.seo.description || s.description || undefined,
  };
}

export default async function ServicePage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const [service, all] = await Promise.all([
    getPublicService(slug, locale),
    listPublicServices(locale),
  ]);
  if (!service) notFound();
  const t = getMessages(locale);
  const s = t.public.services;
  const others = all.filter((x) => x.slug !== service.slug);

  return (
    <>
      <PageHero
        title={service.title}
        intro={service.description}
        crumbLabel={t.public.breadcrumb}
        crumbs={[
          { href: localizedPath(locale, "/"), label: t.site.nav.home },
          { href: localizedPath(locale, "/services"), label: s.title },
          { label: service.title },
        ]}
      >
        <span
          aria-hidden="true"
          className="mt-8 flex size-14 items-center justify-center bg-highlight text-highlight-foreground"
        >
          <ServiceIcon name={service.icon} className="size-7" />
        </span>
      </PageHero>

      <div className="container-site grid gap-12 py-14 lg:grid-cols-[1fr_20rem] lg:py-20">
        <div className="min-w-0">
          {service.cover ? (
            <CoverImage
              image={service.cover}
              alt={service.title}
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="mb-10 aspect-[16/9]"
              priority
            />
          ) : null}
          <RichText doc={service.content} />
          {service.process.length ? (
            <section className="mt-14" aria-labelledby="process-title">
              <h2 id="process-title" className="mb-8 text-2xl type-heading">
                {s.process}
              </h2>
              <ol className="grid gap-6">
                {service.process.map((step, i) => (
                  <li key={step.title} className="grid grid-cols-[3rem_1fr] gap-4">
                    <span
                      aria-hidden="true"
                      className="flex size-12 items-center justify-center border-2 border-highlight text-lg font-bold tabular-nums"
                    >
                      {i + 1}
                    </span>
                    <div className="pt-2">
                      <h3 className="text-lg type-heading">{step.title}</h3>
                      {step.description ? (
                        <p className="mt-1 text-muted-foreground">{step.description}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
        {others.length ? (
          <aside aria-labelledby="other-services" className="lg:sticky lg:top-28 lg:self-start">
            <h2
              id="other-services"
              className="mb-4 text-sm font-semibold tracking-widest text-muted-foreground uppercase"
            >
              {s.otherServices}
            </h2>
            <ul className="grid border-t">
              {others.map((o) => (
                <li key={o.slug} className="border-b">
                  <Link
                    href={localizedPath(locale, `/services/${o.slug}`) as Route}
                    className="flex items-center gap-3 py-3 font-medium hover:text-primary"
                  >
                    <ServiceIcon name={o.icon} className="size-4 text-highlight" />
                    {o.title}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </div>

      {service.projects.length ? (
        <section className="bg-muted/50 py-16 lg:py-24" aria-labelledby="service-projects">
          <div className="container-site">
            <SectionHeading title={s.relatedProjects} id="service-projects" />
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {service.projects.map((p) => (
                <ProjectCard key={p.slug} project={p} locale={locale} t={t.public} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <CtaBand
        title={s.ctaTitle}
        text={s.ctaText}
        primary={{
          href: localizedPath(locale, "/request-quote"),
          label: t.public.home.heroCtaQuote,
        }}
      />
    </>
  );
}
