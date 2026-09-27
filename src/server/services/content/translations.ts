import { Prisma } from "@/generated/prisma/client";
import { defaultLocale, type Locale } from "@/config/i18n";

/** Translation for `locale`, falling back to the default language, then any. */
export function pickTranslation<T extends { locale: string }>(
  translations: T[],
  locale: Locale,
): T | undefined {
  return (
    translations.find((t) => t.locale === locale) ??
    translations.find((t) => t.locale === defaultLocale) ??
    translations[0]
  );
}

/** Locales present in a validated translations object. */
export function presentLocales<T>(translations: Partial<Record<Locale, T>>): Locale[] {
  return Object.keys(translations) as Locale[];
}

/**
 * JSON column value for writes. Null must be Prisma.DbNull: `undefined`
 * would mean "leave unchanged" on update, so clearing a field would not stick.
 */
export function jsonOrNull(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (value === null || value === undefined) return Prisma.DbNull;
  if (Array.isArray(value) && value.length === 0) return Prisma.DbNull;
  return value as Prisma.InputJsonValue;
}
