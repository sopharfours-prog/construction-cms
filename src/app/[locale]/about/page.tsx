import { AwardIcon } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { CoverImage } from "@/components/site/cards";
import { CtaBand } from "@/components/site/cta-band";
import { PageHero, SectionHeading } from "@/components/site/page-hero";
import { RichText } from "@/components/site/rich-text";
import { isLocale } from "@/config/i18n";
import { fmt } from "@/i18n/format";
import { getMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getAboutData } from "@/server/public/content";
import { nameInitials } from "@/lib/content/initials";
import { pageMetadata } from "@/lib/seo/metadata";
import { getEnabledLocales } from "@/server/services/site-settings";
import { getSiteShell } from "@/server/public/site";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const [{ page }, shell] = await Promise.all([getAboutData(locale), getSiteShell(locale)]);
  return pageMetadata({
    enabledLocales: await getEnabledLocales(),
    locale,
    path: "/about",
    title: page?.seo.title || page?.title || getMessages(locale).public.about.title,
    description: page?.seo.description || shell.description,
    image: page?.cover ?? shell.seo.ogImage,
    siteName: shell.name,
  });
}

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getMessages(locale);
  const a = t.public.about;
  const { page, team, certifications, milestones } = await getAboutData(locale);
  const title = page?.title ?? a.title;

  return (
    <>
      <PageHero
        title={title}
        crumbLabel={t.public.breadcrumb}
        crumbs={[{ href: localizedPath(locale, "/"), label: t.site.nav.home }, { label: title }]}
      />

      {page ? (
        <section
          className={cn(
            "container-site grid gap-12 py-14 lg:py-20",
            page.cover && "lg:grid-cols-[1fr_24rem]",
          )}
        >
          <RichText doc={page.content} className="max-w-3xl text-lg" />
          {page.cover ? (
            <CoverImage
              image={page.cover}
              alt={title}
              sizes="(min-width: 1024px) 24rem, 100vw"
              className="aspect-[4/5]"
              priority
            />
          ) : null}
        </section>
      ) : null}

      {milestones.length ? (
        <section
          className="bg-brand py-16 text-brand-foreground lg:py-24"
          aria-labelledby="history-title"
        >
          <div className="container-site">
            <h2 id="history-title" className="mb-12 text-3xl type-heading md:text-4xl">
              {a.history}
            </h2>
            <ol
              className={cn(
                "relative grid gap-10 border-l border-brand-foreground/20 pl-8 md:grid-cols-2 md:gap-x-12 lg:border-l-0 lg:pl-0",
                // Four milestones sit on one row instead of leaving one alone on a second.
                milestones.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
              )}
            >
              {milestones.map((m) => (
                <li
                  key={m.id}
                  className="relative lg:border-t lg:border-brand-foreground/20 lg:pt-6"
                >
                  <span
                    aria-hidden="true"
                    className="absolute top-1.5 -left-[2.3rem] size-3 bg-highlight lg:-top-1.5 lg:left-0"
                  />
                  <p className="text-4xl type-display text-highlight tabular-nums">{m.year}</p>
                  <h3 className="mt-2 text-lg type-heading">{m.title}</h3>
                  {m.description ? (
                    <p className="mt-2 text-sm leading-relaxed text-brand-foreground/75">
                      {m.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {team.length ? (
        <section className="container-site py-16 lg:py-24" aria-labelledby="team-title">
          <SectionHeading title={a.team} id="team-title" />
          <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((member) => (
              <li key={member.id}>
                <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                  {member.photo ? (
                    <Image
                      src={member.photo.url}
                      alt={member.photo.altText || member.name}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  ) : (
                    // No portrait yet: initials in the brand colours (never a stand-in face).
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 flex items-center justify-center bg-brand bg-[repeating-linear-gradient(135deg,transparent_0_22px,color-mix(in_oklab,var(--brand-foreground)_6%,transparent)_22px_23px)] text-brand-foreground"
                    >
                      <span className="text-6xl type-display tracking-wide">
                        {nameInitials(member.name)}
                      </span>
                      <span className="absolute inset-x-0 bottom-0 h-1.5 bg-highlight" />
                    </div>
                  )}
                </div>
                <h3 className="mt-4 text-lg type-heading">{member.name}</h3>
                <p className="text-sm font-medium text-highlight-ink">{member.position}</p>
                {member.bio ? (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{member.bio}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {certifications.length ? (
        <section className="bg-muted/50 py-16 lg:py-24" aria-labelledby="cert-title">
          <div className="container-site">
            <SectionHeading title={a.certifications} id="cert-title" />
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {certifications.map((c) => (
                <li key={c.id} className="flex gap-4 border bg-card p-5">
                  <AwardIcon className="size-8 shrink-0 text-highlight" aria-hidden="true" />
                  <div>
                    <h3 className="font-semibold">{c.name}</h3>
                    {c.issuer ? (
                      <p className="text-sm text-muted-foreground">
                        {fmt(a.issuedBy, { issuer: c.issuer })}
                      </p>
                    ) : null}
                    {c.description ? <p className="mt-2 text-sm">{c.description}</p> : null}
                    {c.expiresAt ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {fmt(a.validUntil, { date: formatDate(c.expiresAt, locale) })}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
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
    </>
  );
}
