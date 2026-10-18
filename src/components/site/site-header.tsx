import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";

import { Button } from "@/components/ui/button";
import { localeConfig, type Locale } from "@/config/i18n";
import { fmt } from "@/i18n/format";
import { getMessages, type Messages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import type { SiteShell } from "@/server/public/site";

import { ThemeToggle } from "@/components/shared/theme-toggle";

import { AccountMenu } from "./account-menu";
import { LanguageSwitcher } from "./language-switcher";
import { MobileMenu } from "./mobile-menu";
import { NavLink } from "./nav-link";
import { SearchForm } from "./search-form";

export function siteNavigation(locale: Locale, t: Messages["site"]) {
  return [
    { href: localizedPath(locale, "/"), label: t.nav.home, exact: true },
    { href: localizedPath(locale, "/about"), label: t.nav.about },
    { href: localizedPath(locale, "/services"), label: t.nav.services },
    { href: localizedPath(locale, "/projects"), label: t.nav.projects },
    { href: localizedPath(locale, "/news"), label: t.nav.news },
    { href: localizedPath(locale, "/contact"), label: t.nav.contact },
  ];
}

export function SiteHeader({
  locale,
  shell,
  t,
  languages,
}: {
  languages: Locale[];
  locale: Locale;
  shell: SiteShell;
  t: Messages["site"];
}) {
  const items = siteNavigation(locale, t);
  const common = getMessages(locale).common;
  const themeLabels = { toDark: common.switchToDark, toLight: common.switchToLight };
  const search = getMessages(locale).public.siteSearch;
  const searchPath = localizedPath(locale, "/search");
  const cta = { href: localizedPath(locale, "/request-quote"), label: t.nav.requestQuote };
  // Each switch link is marked up in its target language, so its label is too.
  const languageLabels = {
    language: t.language,
    switchTo: Object.fromEntries(
      languages.map((l) => [
        l,
        fmt(getMessages(l).site.switchTo, { language: localeConfig[l].nativeName }),
      ]),
    ) as Partial<Record<Locale, string>>,
  };
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="container-site flex h-16 items-center gap-6 lg:h-20">
        <Link
          href={localizedPath(locale, "/") as Route}
          className="flex min-w-0 items-center gap-3"
          aria-label={shell.name}
        >
          {shell.logo ? (
            <Image
              src={shell.logo.url}
              alt=""
              width={shell.logo.width ?? 160}
              height={shell.logo.height ?? 40}
              className="h-9 w-auto lg:h-10"
              priority
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center bg-brand text-sm font-bold text-brand-foreground lg:size-10"
            >
              {shell.name.slice(0, 1)}
            </span>
          )}
          <span className="truncate text-base type-heading lg:text-lg">{shell.name}</span>
        </Link>

        <nav aria-label={t.mainNav} className="ml-auto hidden items-center gap-5 lg:flex 2xl:gap-7">
          {items.map((item) => (
            <NavLink key={item.href} href={item.href} exact={item.exact}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 lg:ml-0">
          {languages.length > 1 ? (
            <LanguageSwitcher current={locale} available={languages} labels={languageLabels} />
          ) : null}
          <ThemeToggle labels={themeLabels} className="hidden sm:inline-flex" />
          {/* Staff sign-in and account requests; the CMS is outside this layout. */}
          <AccountMenu registrationOpen={shell.registrationOpen} labels={t.account} />
          <Button asChild className="hidden md:inline-flex">
            <Link href={cta.href as Route}>{cta.label}</Link>
          </Button>
          <MobileMenu
            items={items}
            cta={cta}
            title={shell.name}
            labels={t}
            search={<SearchForm id="menu-search" action={searchPath} labels={search} />}
          >
            {/* On phones the theme switch lives here, leaving the header room for the name. */}
            <ThemeToggle labels={themeLabels} showLabel className="w-full sm:hidden" />
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
