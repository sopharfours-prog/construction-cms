"use client";

import { CheckIcon, ChevronDownIcon } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

import { FlagIcon } from "@/components/shared/flag-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { localeConfig, type Locale } from "@/config/i18n";
import { SITE_LOCALE_COOKIE, switchLocalePath } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * Language menu: the current language's flag, opening a list of languages
 * (flag and native name). Each entry links to the same page in that language
 * and the choice is remembered. Flags alone say nothing to screen readers, so
 * every entry is named in its own language.
 */
export function LanguageSwitcher({
  current,
  available,
  labels,
  className,
}: {
  available: readonly Locale[];
  current: Locale;
  /** switchTo: per target locale, written in that locale ("Read this page in English"). */
  labels: { language: string; switchTo: Partial<Record<Locale, string>> };
  className?: string;
}) {
  const pathname = usePathname();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn("h-9 gap-1.5 px-2", className)}
          aria-label={`${labels.language}: ${localeConfig[current].nativeName}`}
        >
          <FlagIcon locale={current} />
          <span className="text-xs font-semibold">{localeConfig[current].label}</span>
          <ChevronDownIcon className="size-3.5 opacity-60" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {available.map((locale) =>
          locale === current ? (
            <DropdownMenuItem
              key={locale}
              disabled
              aria-current="true"
              className="data-[disabled]:opacity-100"
            >
              <FlagIcon locale={locale} />
              <span lang={localeConfig[locale].htmlLang} className="flex-1 font-medium">
                {localeConfig[locale].nativeName}
              </span>
              <CheckIcon className="text-primary" aria-hidden="true" />
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem key={locale} asChild>
              <Link
                href={switchLocalePath(pathname, locale) as Route}
                hrefLang={localeConfig[locale].htmlLang}
                lang={localeConfig[locale].htmlLang}
                aria-label={labels.switchTo[locale]}
                onClick={() => {
                  document.cookie = `${SITE_LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
                }}
              >
                <FlagIcon locale={locale} />
                <span className="flex-1">{localeConfig[locale].nativeName}</span>
              </Link>
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
