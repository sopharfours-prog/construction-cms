import { ArrowRightIcon, MapPinIcon } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { NewsCard, ProjectCard, ServiceCard } from "@/components/site/cards";
import { CtaBand } from "@/components/site/cta-band";
import { SectionHeading } from "@/components/site/page-hero";
import { Button } from "@/components/ui/button";
import { isLocale } from "@/config/i18n";
import { getMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { formatNumber } from "@/lib/format";
import { getHomeData } from "@/server/public/content";
import { getSiteShell } from "@/server/public/site";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getMessages(locale);
  const h = t.public.home;
  const [shell, data] = await Promise.all([getSiteShell(locale), getHomeData(locale)]);
  const hero = data.featured.find((p) => p.cover) ?? null;
  const path = (p: string) => localizedPath(locale, p) as Route;
  const stats = [
    { value: data.stats.projects, label: h.stats.projects },
    { value: data.stats.years, label: h.stats.years },
    { value: data.stats.clients, label: h.stats.clients },
    { value: data.stats.team, label: h.stats.team },
  ].filter(
    (s): s is { value: number; label: string } => typeof s.value === "number" && s.value > 0,
  );

  return (
    <>
      {/* Hero */}
      <section className="relative isolate flex min-h-[78svh] items-end overflow-hidden bg-primary text-primary-foreground">
        {hero?.cover ? (
          <Image
            src={hero.cover.url}
            alt=""
            fill
            priority
            sizes="100vw"
            placeholder={hero.cover.blurDataUrl ? "blur" : "empty"}
            blurDataURL={hero.cover.blurDataUrl ?? undefined}
            className="-z-10 object-cover"
          />
        ) : null}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-t from-primary via-primary/80 to-primary/30"
        />
        <div className="container-site grid w-full gap-10 pt-32 pb-14 lg:grid-cols-[1fr_22rem] lg:items-end lg:pb-20">
          <div>
            <p className="mb-5 flex items-center gap-3 text-sm font-semibold tracking-widest text-highlight uppercase">
              <span aria-hidden="true" className="h-px w-10 bg-highlight" />
              {shell.name}
            </p>
            <h1 className="max-w-4xl text-5xl type-display text-balance sm:text-6xl lg:text-7xl xl:text-8xl">
              {shell.tagline || shell.name}
            </h1>
            {shell.description ? (
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-primary-foreground/85 md:text-xl">
                {shell.description}
              </p>
            ) : null}
            <div className="mt-10 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-highlight text-highlight-foreground hover:bg-highlight/90"
              >
                <Link href={path("/projects")}>
                  {h.heroCtaProjects}
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/60 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link href={path("/request-quote")}>{h.heroCtaQuote}</Link>
              </Button>
            </div>
          </div>
          {hero ? (
            <Link
              href={path(`/projects/${hero.slug}`)}
              className="group hidden border-l-2 border-highlight bg-primary/70 p-5 backdrop-blur transition hover:bg-primary/90 lg:block"
            >
              <p className="text-xs font-semibold tracking-widest text-highlight uppercase">
                {h.featuredProject}
              </p>
              <p className="mt-2 text-lg type-heading">{hero.title}</p>
              {hero.location ? (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-primary-foreground/75">
                  <MapPinIcon className="size-4" aria-hidden="true" />
                  {hero.location}
                </p>
              ) : null}
            </Link>
          ) : null}
        </div>
      </section>

      {/* About */}
      {data.about ? (
        <section
          className="container-site grid gap-10 py-20 lg:grid-cols-[1fr_1.4fr] lg:py-28"
          aria-labelledby="about-title"
        >
          <SectionHeading
            eyebrow={h.aboutEyebrow}
            title={data.about.title}
            id="about-title"
            className="mb-0"
          />
          <div>
            <p className="text-lg leading-relaxed text-muted-foreground">{data.about.excerpt}</p>
            <Button asChild variant="link" className="mt-6 h-auto px-0 text-base font-semibold">
              <Link href={path("/about")}>
                {h.aboutCta}
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>
      ) : null}

      {/* Services */}
      {data.services.length ? (
        <section className="bg-muted/50 py-20 lg:py-28" aria-labelledby="services-title">
          <div className="container-site">
            <SectionHeading
              eyebrow={h.servicesEyebrow}
              title={h.servicesTitle}
              id="services-title"
              action={
                <Button asChild variant="outline">
                  <Link href={path("/services")}>{t.public.viewAll}</Link>
                </Button>
              }
            />
            <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3">
              {data.services.map((service, i) => (
                <ServiceCard
                  key={service.slug}
                  service={service}
                  locale={locale}
                  t={t.public}
                  index={i}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Featured projects */}
      {data.featured.length ? (
        <section className="container-site py-20 lg:py-28" aria-labelledby="projects-title">
          <SectionHeading
            eyebrow={h.projectsEyebrow}
            title={h.projectsTitle}
            id="projects-title"
            action={
              <Button asChild variant="outline">
                <Link href={path("/projects")}>{t.public.viewAll}</Link>
              </Button>
            }
          />
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {data.featured.map((project) => (
              <ProjectCard key={project.slug} project={project} locale={locale} t={t.public} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Statistics */}
      {stats.length ? (
        <section className="bg-primary text-primary-foreground" aria-labelledby="stats-title">
          <div className="container-site py-16 lg:py-20">
            <h2 id="stats-title" className="sr-only">
              {h.statsTitle}
            </h2>
            <dl className="grid grid-cols-2 gap-y-10 lg:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="border-l-2 border-highlight pl-5">
                  <dd className="text-5xl type-display tabular-nums lg:text-6xl">
                    {formatNumber(s.value, locale)}+
                  </dd>
                  <dt className="mt-2 text-sm text-primary-foreground/75">{s.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </section>
      ) : null}

      {/* News */}
      {data.news.length ? (
        <section className="container-site py-20 lg:py-28" aria-labelledby="news-title">
          <SectionHeading
            eyebrow={h.newsEyebrow}
            title={h.newsTitle}
            id="news-title"
            action={
              <Button asChild variant="outline">
                <Link href={path("/news")}>{t.public.viewAll}</Link>
              </Button>
            }
          />
          <div className="grid gap-10 md:grid-cols-3">
            {data.news.map((item) => (
              <NewsCard key={item.slug} news={item} locale={locale} t={t.public} />
            ))}
          </div>
        </section>
      ) : null}

      <CtaBand
        title={h.ctaTitle}
        text={h.ctaText}
        primary={{ href: path("/request-quote"), label: h.heroCtaQuote }}
        secondary={{ href: path("/contact"), label: h.heroCtaContact }}
      />
    </>
  );
}
