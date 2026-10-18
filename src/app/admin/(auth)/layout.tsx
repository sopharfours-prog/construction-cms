import { ArrowLeftIcon } from "lucide-react";
import Image from "next/image";
import type { Route } from "next";
import Link from "next/link";

import { LocaleSwitch } from "@/components/admin/shell/locale-switch";
import { AuthTabs } from "@/components/admin/auth/auth-tabs";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { localeConfig, locales } from "@/config/i18n";
import { siteConfig } from "@/config/site";
import { getAdminMessages } from "@/i18n/admin";
import { getAdminLocale } from "@/i18n/admin-locale";
import { getMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { getSiteShell } from "@/server/public/site";

/**
 * Sign in, staff registration and password pages: one centred card under the
 * company's logo, with a way back to the website, the language and the theme.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await getAdminLocale();
  const m = getMessages(locale);
  const t = m.auth;
  const shell = await getSiteShell(locale);
  const companyName = shell.name || siteConfig.fallbackName;

  return (
    <div
      lang={locale}
      className="relative flex min-h-dvh flex-col bg-muted/40 [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:32px_32px] dark:bg-background"
    >
      {/* Fades the blueprint grid towards the edges, so the card stays the focus. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--background)_75%)]"
      />

      <header className="relative flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href={localizedPath(locale, "/") as Route}
          className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          {t.shell.backToSite}
        </Link>
        <div className="flex items-center gap-1">
          <LocaleSwitch
            current={locale}
            label={getAdminMessages(locale).header.language}
            options={locales.map((l) => ({
              locale: l,
              label: localeConfig[l].label,
              nativeName: localeConfig[l].nativeName,
            }))}
          />
          <ThemeToggle
            labels={{ toDark: m.common.switchToDark, toLight: m.common.switchToLight }}
          />
        </div>
      </header>

      <main className="relative flex flex-1 items-start justify-center px-4 pt-4 pb-12 sm:items-center sm:pt-0">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            {shell.logo ? (
              <Image
                src={shell.logo.url}
                alt=""
                width={shell.logo.width ?? 160}
                height={shell.logo.height ?? 48}
                className="h-12 w-auto rounded-md"
                priority
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex size-12 items-center justify-center rounded-xl bg-brand text-lg font-bold text-brand-foreground"
              >
                {companyName.slice(0, 1)}
              </span>
            )}
            <div>
              <p className="text-lg type-heading">{companyName}</p>
              <p className="text-sm text-muted-foreground">{t.cmsName}</p>
            </div>
          </div>

          {/* Fields and the main button are a touch larger than in the CMS: easier on phones. */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8 [&_[data-slot=input]]:h-11 [&_button[type=submit]]:h-11">
            <AuthTabs registrationOpen={shell.registrationOpen} labels={t.shell} />
            {children}
          </div>
        </div>
      </main>

      <footer className="relative pb-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {companyName}
      </footer>
    </div>
  );
}
