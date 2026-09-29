"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

import { localeConfig, type Locale } from "@/config/i18n";
import { fmt } from "@/i18n/format";
import { SITE_LOCALE_COOKIE, switchLocalePath } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/** "LO | EN": plain links to the same page in the other language; the choice is remembered. */
export function LanguageSwitcher({
  current,
  available,
  labels,
  className,
}: {
  available: readonly Locale[];
  current: Locale;
  labels: { language: string; switchTo: string };
  className?: string;
}) {
  const pathname = usePathname();
  return (
    <nav
      aria-label={labels.language}
      className={cn("flex items-center text-sm font-semibold", className)}
    >
      {available.map((locale, index) => (
        <span key={locale} className="flex items-center">
          {index > 0 ? (
            <span aria-hidden="true" className="px-1.5 opacity-40">
              |
            </span>
          ) : null}
          {locale === current ? (
            <span aria-current="true" className="px-1 py-1">
              {localeConfig[locale].label}
            </span>
          ) : (
            <Link
              href={switchLocalePath(pathname, locale) as Route}
              hrefLang={localeConfig[locale].htmlLang}
              lang={localeConfig[locale].htmlLang}
              aria-label={fmt(labels.switchTo, { language: localeConfig[locale].nativeName })}
              className="rounded-sm px-1 py-1 opacity-60 transition hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              onClick={() => {
                document.cookie = `${SITE_LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
              }}
            >
              {localeConfig[locale].label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
