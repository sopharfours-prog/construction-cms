import { ClockIcon, MailIcon, MapPinIcon, PhoneIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContactForm } from "@/components/site/forms/request-forms";
import { PageHero } from "@/components/site/page-hero";
import { isLocale } from "@/config/i18n";
import { getMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { getSiteShell } from "@/server/public/site";
import { getSetting } from "@/server/services/settings";
import { pageMetadata } from "@/lib/seo/metadata";
import { getEnabledLocales } from "@/server/services/site-settings";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getMessages(locale).public.contact;
  const shell = await getSiteShell(locale);
  return pageMetadata({
    enabledLocales: await getEnabledLocales(),
    locale,
    path: "/contact",
    title: t.title,
    description: t.intro,
    image: shell.seo.ogImage,
    siteName: shell.name,
  });
}

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getMessages(locale);
  const c = t.public.contact;
  const [shell, contact] = await Promise.all([getSiteShell(locale), getSetting("contact")]);
  const item = "flex gap-4";
  const icon = "mt-1 size-5 shrink-0 text-highlight";

  return (
    <>
      <PageHero
        title={c.title}
        intro={c.intro}
        crumbLabel={t.public.breadcrumb}
        crumbs={[{ href: localizedPath(locale, "/"), label: t.site.nav.home }, { label: c.title }]}
      />
      <div className="container-site grid grid-cols-1 gap-12 py-14 lg:grid-cols-[22rem_1fr] lg:gap-16 lg:py-20">
        <aside aria-labelledby="contact-details">
          <h2 id="contact-details" className="mb-6 text-2xl type-heading">
            {c.details}
          </h2>
          <address className="grid gap-6 not-italic">
            {shell.contact.address ? (
              <div className={item}>
                <MapPinIcon className={icon} aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold">{c.address}</p>
                  <p className="text-muted-foreground">{shell.contact.address}</p>
                </div>
              </div>
            ) : null}
            {shell.contact.phones.length ? (
              <div className={item}>
                <PhoneIcon className={icon} aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold">{c.phone}</p>
                  {shell.contact.phones.map((p) => (
                    <a
                      key={p}
                      href={`tel:${p.replace(/[^+0-9]/g, "")}`}
                      className="block text-muted-foreground hover:text-foreground"
                    >
                      {p}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
            {shell.contact.email ? (
              <div className={item}>
                <MailIcon className={icon} aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold">{c.email}</p>
                  <a
                    href={`mailto:${shell.contact.email}`}
                    className="break-all text-muted-foreground hover:text-foreground"
                  >
                    {shell.contact.email}
                  </a>
                </div>
              </div>
            ) : null}
            {shell.contact.openingHours ? (
              <div className={item}>
                <ClockIcon className={icon} aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold">{c.hours}</p>
                  <p className="whitespace-pre-line text-muted-foreground">
                    {shell.contact.openingHours}
                  </p>
                </div>
              </div>
            ) : null}
          </address>
        </aside>
        <section
          aria-labelledby="contact-form"
          className="border-t-4 border-highlight bg-card p-6 shadow-sm sm:p-8"
        >
          <h2 id="contact-form" className="mb-6 text-2xl type-heading">
            {c.formTitle}
          </h2>
          <ContactForm locale={locale} f={t.public.form} />
        </section>
      </div>
      {contact?.mapEmbedUrl ? (
        <section aria-label={c.map} className="h-[28rem] bg-muted">
          <iframe
            src={contact.mapEmbedUrl}
            title={c.map}
            className="size-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          />
        </section>
      ) : null}
    </>
  );
}
