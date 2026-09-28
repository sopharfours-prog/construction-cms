import { MailIcon, MapPinIcon, PhoneIcon } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import type { Locale } from "@/config/i18n";
import type { Messages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import type { SiteShell } from "@/server/public/site";

import { siteNavigation } from "./site-header";

const socialNames: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
};

export function SiteFooter({
  locale,
  shell,
  t,
}: {
  locale: Locale;
  shell: SiteShell;
  t: Messages["site"];
}) {
  const f = t.footer;
  const heading = "mb-4 text-xs font-semibold tracking-widest text-primary-foreground/60 uppercase";
  const link = "text-primary-foreground/80 transition-colors hover:text-primary-foreground";
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container-site grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4 lg:py-20">
        <div className="grid content-start gap-4">
          <p className="text-xl type-heading">{shell.name}</p>
          {shell.description ? (
            <p className="text-sm leading-relaxed text-primary-foreground/75">
              {shell.description}
            </p>
          ) : null}
        </div>

        <nav aria-label={f.quickLinks}>
          <h2 className={heading}>{f.quickLinks}</h2>
          <ul className="grid gap-2 text-sm">
            {siteNavigation(locale, t).map((item) => (
              <li key={item.href}>
                <Link href={item.href as Route} className={link}>
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href={localizedPath(locale, "/request-quote") as Route} className={link}>
                {t.nav.requestQuote}
              </Link>
            </li>
          </ul>
        </nav>

        {shell.services.length ? (
          <nav aria-label={f.services}>
            <h2 className={heading}>{f.services}</h2>
            <ul className="grid gap-2 text-sm">
              {shell.services.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={localizedPath(locale, `/services/${s.slug}`) as Route}
                    className={link}
                  >
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <div>
          <h2 className={heading}>{f.contact}</h2>
          <address className="grid gap-3 text-sm text-primary-foreground/80 not-italic">
            {shell.contact.address ? (
              <p className="flex gap-2">
                <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {shell.contact.address}
              </p>
            ) : null}
            {shell.contact.phones.map((phone) => (
              <a
                key={phone}
                href={`tel:${phone.replace(/[^+0-9]/g, "")}`}
                className={`flex gap-2 ${link}`}
              >
                <PhoneIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {phone}
              </a>
            ))}
            {shell.contact.email ? (
              <a href={`mailto:${shell.contact.email}`} className={`flex gap-2 break-all ${link}`}>
                <MailIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {shell.contact.email}
              </a>
            ) : null}
          </address>
          {shell.social.length ? (
            <div className="mt-6">
              <h2 className={heading}>{f.followUs}</h2>
              <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                {shell.social.map(([network, url]) => (
                  <li key={network}>
                    <a href={url} className={link} target="_blank" rel="noopener noreferrer">
                      {socialNames[network] ?? network}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
      <div className="border-t border-primary-foreground/15">
        <div className="container-site flex flex-col gap-3 py-6 text-xs text-primary-foreground/65 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {shell.name}. {f.rights}
          </p>
          <ul className="flex gap-5">
            <li>
              <Link href={localizedPath(locale, "/privacy-policy") as Route} className={link}>
                {f.privacy}
              </Link>
            </li>
            <li>
              <Link href={localizedPath(locale, "/terms") as Route} className={link}>
                {f.terms}
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
