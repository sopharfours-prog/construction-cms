import { ArrowRightIcon, MapPinIcon } from "lucide-react";
import type { Metadata, Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CoverImage, NewsCard, ProjectCard, ServiceCard } from "@/components/site/cards";
import { CtaBand } from "@/components/site/cta-band";
import { SectionHeading } from "@/components/site/page-hero";
import { SearchForm } from "@/components/site/search-form";
import { Button } from "@/components/ui/button";
import { isLocale } from "@/config/i18n";
import { getMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getHomeData } from "@/server/public/content";
import { pageMetadata } from "@/lib/seo/metadata";
import { getEnabledLocales } from "@/server/services/site-settings";
import { getSiteShell } from "@/server/public/site";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const shell = await getSiteShell(locale);
  const title = shell.seo.title || shell.tagline || shell.name;
  return pageMetadata({
    enabledLocales: await getEnabledLocales(),
    locale,
    path: "/",
    title,
    description: shell.seo.description || shell.description,
    image: shell.seo.ogImage,
    siteName: shell.name,
    absoluteTitle: true,
  });
}

/**
 * Featured projects as a showcase that always fills its rows: one large lead
 * card beside two (3 to 4 projects) or four (5 or more) smaller ones. With one
 * or two projects they simply share the row.
 */
function showcase(count: number) {
  if (count >= 5) return { shown: 5, lead: true, grid: "md:grid-cols-2 lg:grid-cols-4" };
  if (count >= 3) return { shown: 3, lead: true, grid: "md:grid-cols-2 lg:grid-cols-3" };
  return { shown: count, lead: false, grid: count === 2 ? "md:grid-cols-2" : "max-w-3xl" };
}

// Literal class names (Tailwind only generates classes it can read in the source).
const columns = ["", "", "md:grid-cols-2", "md:grid-cols-3"];
const statColumns = ["", "lg:grid-cols-1", "lg:grid-cols-2", "lg:grid-cols-3", "lg:grid-cols-4"];

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getMessages(locale);
  const h = t.public.home;
  const [shell, data] = await Promise.all([getSiteShell(locale), getHomeData(locale)]);
  const hero = data.featured.find((p) => p.cover) ?? null;
  // The photo chosen for the home page, else the first featured project's cover.
  const heroPhoto = data.heroImage ?? hero?.cover ?? null;
  const path = (p: string) => localizedPath(locale, p) as Route;
  const stats = [
    { value: data.stats.projects, label: h.stats.projects },
    { value: data.stats.years, label: h.stats.years },
    { value: data.stats.clients, label: h.stats.clients },
    { value: data.stats.team, label: h.stats.team },
  ].filter(
    (s): s is { value: number; label: string } => typeof s.value === "number" && s.value > 0,
  );
  const featured = showcase(data.featured.length);

  return (
    <>
      {/* Hero */}
      <section className="relative isolate flex min-h-[78svh] items-end overflow-hidden bg-brand text-brand-foreground">
        {heroPhoto ? (
          <Image
            src={heroPhoto.url}
            alt=""
            fill
            priority
            sizes="100vw"
            placeholder={heroPhoto.blurDataUrl ? "blur" : "empty"}
            blurDataURL={heroPhoto.blurDataUrl ?? undefined}
            className="-z-10 object-cover"
          />
        ) : null}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-t from-brand via-brand/80 to-brand/30"
        />
        <div
          className={cn(
            "container-site grid w-full gap-10 pt-32 lg:grid-cols-[1fr_22rem] lg:items-end",
            stats.length ? "pb-28 lg:pb-36" : "pb-14 lg:pb-20",
          )}
        >
          <div>
            <p className="mb-5 flex items-center gap-3 text-sm font-semibold tracking-widest text-highlight uppercase">
              <span aria-hidden="true" className="h-px w-10 bg-highlight" />
              {shell.name}
            </p>
            <h1 className="max-w-4xl text-5xl type-display text-balance sm:text-6xl lg:text-7xl xl:text-8xl">
              {shell.tagline || shell.name}
            </h1>
            {shell.description ? (
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-brand-foreground/85 md:text-xl">
                {shell.description}
              </p>
            ) : null}
            {/* Search straight from the first screen. */}
            <SearchForm
              id="hero-search"
              size="lg"
              action={path("/search")}
              labels={t.public.siteSearch}
              className="mt-8 max-w-3xl"
            />
            <div className="mt-6 flex flex-wrap gap-3">
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
                className="border-brand-foreground/60 bg-transparent text-brand-foreground hover:bg-brand-foreground/10 hover:text-brand-foreground dark:border-brand-foreground/60 dark:bg-transparent dark:hover:bg-brand-foreground/10"
              >
                <Link href={path("/request-quote")}>{h.heroCtaQuote}</Link>
              </Button>
              {shell.registrationOpen ? (
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="text-brand-foreground underline-offset-4 hover:bg-brand-foreground/10 hover:text-brand-foreground"
                >
                  <Link href="/admin/register">{t.site.nav.register}</Link>
                </Button>
              ) : null}
            </div>
          </div>
          {hero ? (
            <Link
              href={path(`/projects/${hero.slug}`)}
              className="group hidden border-l-2 border-highlight bg-brand/70 p-5 backdrop-blur transition hover:bg-brand/90 lg:block"
            >
              <p className="text-xs font-semibold tracking-widest text-highlight uppercase">
                {h.featuredProject}
              </p>
              <p className="mt-2 text-lg type-heading">{hero.title}</p>
              {hero.location ? (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-brand-foreground/75">
                  <MapPinIcon className="size-4" aria-hidden="true" />
                  {hero.location}
                </p>
              ) : null}
            </Link>
          ) : null}
        </div>
      </section>

      {/* Key figures: a card overlapping the hero, so they are seen without scrolling far. */}
      {stats.length ? (
        <section
          className="relative z-10 container-site -mt-16 lg:-mt-20"
          aria-labelledby="stats-title"
        >
          <h2 id="stats-title" className="sr-only">
            {h.statsTitle}
          </h2>
          <dl
            className={cn(
              "grid grid-cols-2 gap-px border-t-4 border-t-highlight bg-border shadow-xl",
              statColumns[stats.length],
            )}
          >
            {stats.map((s) => (
              <div
                key={s.label}
                className="flex flex-col-reverse bg-card px-5 py-6 last:odd:col-span-2 lg:px-8 lg:py-8 lg:last:odd:col-span-1"
              >
                <dt className="mt-1 text-sm text-muted-foreground">{s.label}</dt>
                <dd className="text-4xl type-display tabular-nums lg:text-5xl">
                  {formatNumber(s.value, locale)}
                  <span className="text-highlight-ink">+</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {/* About */}
      {data.about ? (
        <section
          className="container-site grid grid-cols-1 gap-8 py-16 lg:grid-cols-[5fr_7fr] lg:items-center lg:gap-16 lg:py-24"
          aria-labelledby="about-title"
        >
          <div>
            <SectionHeading
              eyebrow={h.aboutEyebrow}
              title={data.about.title}
              id="about-title"
              className="mb-0"
            />
            {data.aboutImage ? (
              <CoverImage
                image={data.aboutImage}
                alt={data.about.title}
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="mt-8 aspect-[4/3]"
              />
            ) : null}
          </div>
          <div className="border-l-2 border-highlight pl-6 lg:pl-10">
            <p className="text-xl leading-relaxed text-foreground/85 lg:text-2xl lg:leading-relaxed">
              {data.about.excerpt}
            </p>
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
        <section className="bg-muted/50 py-16 lg:py-24" aria-labelledby="services-title">
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
            <div className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-3">
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
        <section className="container-site py-16 lg:py-24" aria-labelledby="projects-title">
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
          <div className={cn("grid gap-6", featured.grid)}>
            {data.featured.slice(0, featured.shown).map((project, i) => (
              <div
                key={project.slug}
                className={featured.lead && i === 0 ? "md:col-span-2 lg:row-span-2" : undefined}
              >
                <ProjectCard
                  project={project}
                  locale={locale}
                  t={t.public}
                  lead={featured.lead && i === 0}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* News */}
      {data.news.length ? (
        <section className="container-site py-16 lg:py-24" aria-labelledby="news-title">
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
          <div className={cn("grid gap-10", columns[data.news.length])}>
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
