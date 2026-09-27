"use client";

import { CircleAlertIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { defaultLocale, localeConfig, locales, type Locale } from "@/config/i18n";

type TranslationTabsProps = {
  fieldErrors: Record<string, string>;
  labels: { defaultLanguage: string; optionalLanguage: string; hasErrors: string };
  children: (locale: Locale) => ReactNode;
};

/**
 * One tab per language. All panels stay mounted (hidden when inactive) so a
 * single submit sends every language, and tabs with errors are flagged.
 */
export function TranslationTabs({ fieldErrors, labels, children }: TranslationTabsProps) {
  const errorLocales = new Set(
    Object.keys(fieldErrors)
      .filter((k) => k.startsWith("translations."))
      .map((k) => k.split(".")[1]),
  );

  return (
    <Tabs defaultValue={defaultLocale} className="gap-4">
      <TabsList>
        {locales.map((locale) => (
          <TabsTrigger key={locale} value={locale} lang={locale} className="gap-1.5 px-4">
            {localeConfig[locale].nativeName}
            {errorLocales.has(locale) ? (
              <CircleAlertIcon
                className="size-3.5 text-destructive"
                aria-label={labels.hasErrors}
              />
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>
      {locales.map((locale) => (
        <TabsContent
          key={locale}
          value={locale}
          forceMount
          className="grid gap-5 data-[state=inactive]:hidden"
          lang={locale}
        >
          <p className="text-xs text-muted-foreground">
            {locale === defaultLocale ? labels.defaultLanguage : labels.optionalLanguage}
          </p>
          {children(locale)}
        </TabsContent>
      ))}
    </Tabs>
  );
}
