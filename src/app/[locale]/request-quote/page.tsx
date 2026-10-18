import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { QuoteForm } from "@/components/site/forms/request-forms";
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
}: PageProps<"/[locale]/request-quote">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getMessages(locale).public.quote;
  const shell = await getSiteShell(locale);
  return pageMetadata({
    enabledLocales: await getEnabledLocales(),
    locale,
    path: "/request-quote",
    title: t.title,
    description: t.intro,
    image: shell.seo.ogImage,
    siteName: shell.name,
  });
}

export default async function RequestQuotePage({ params }: PageProps<"/[locale]/request-quote">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getMessages(locale);
  const q = t.public.quote;
  const services = await listPublicServices(locale);
  return (
    <>
      <PageHero
        title={q.title}
        intro={q.intro}
        crumbLabel={t.public.breadcrumb}
        crumbs={[{ href: localizedPath(locale, "/"), label: t.site.nav.home }, { label: q.title }]}
      />
      <div className="container-site grid grid-cols-1 gap-12 py-14 lg:grid-cols-[1fr_18rem] lg:py-20">
        <section
          aria-labelledby="quote-form"
          className="border-t-4 border-highlight bg-card p-6 shadow-sm sm:p-8"
        >
          <h2 id="quote-form" className="mb-6 text-2xl type-heading">
            {q.formTitle}
          </h2>
          <QuoteForm
            locale={locale}
            f={t.public.form}
            services={services.map((s) => ({ id: s.id, slug: s.slug, title: s.title }))}
          />
        </section>
        <aside className="lg:pt-8">
          <ol className="grid gap-6">
            {q.steps.map((step, i) => (
              <li key={step} className="grid grid-cols-[2.5rem_1fr] items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-10 items-center justify-center bg-primary font-bold text-primary-foreground"
                >
                  {i + 1}
                </span>
                <span className="font-medium">{step}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </>
  );
}
