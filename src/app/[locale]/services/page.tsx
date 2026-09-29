import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ServiceCard } from "@/components/site/cards";
import { CtaBand } from "@/components/site/cta-band";
import { PageHero } from "@/components/site/page-hero";
import { isLocale } from "@/config/i18n";
import { getMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { listPublicServices } from "@/server/public/content";
import { pageMetadata } from "@/lib/seo/metadata";
import { getEnabledLocales } from "@/server/services/site-settings";
import { getSiteShell } from "@/server/public/site";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/services">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getMessages(locale).public.services;
  const shell = await getSiteShell(locale);
  return pageMetadata({
    enabledLocales: await getEnabledLocales(),
    locale,
    path: "/services",
    title: t.title,
    description: t.intro,
    image: shell.seo.ogImage,
    siteName: shell.name,
  });
}

export default async function ServicesPage({ params }: PageProps<"/[locale]/services">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getMessages(locale);
  const services = await listPublicServices(locale);
  return (
    <>
      <PageHero
        title={t.public.services.title}
        intro={t.public.services.intro}
        crumbLabel={t.public.breadcrumb}
        crumbs={[
          { href: localizedPath(locale, "/"), label: t.site.nav.home },
          { label: t.public.services.title },
        ]}
      />
      <section className="container-site py-14 lg:py-20" aria-label={t.public.services.title}>
        <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => (
            <ServiceCard
              key={service.slug}
              service={service}
              locale={locale}
              t={t.public}
              index={i}
            />
          ))}
        </div>
      </section>
      <CtaBand
        title={t.public.services.ctaTitle}
        text={t.public.services.ctaText}
        primary={{
          href: localizedPath(locale, "/request-quote"),
          label: t.public.home.heroCtaQuote,
        }}
        secondary={{ href: localizedPath(locale, "/contact"), label: t.public.home.heroCtaContact }}
      />
    </>
  );
}
