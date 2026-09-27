/**
 * Locale registry. Adding a language means adding one entry here plus its
 * message file in src/i18n/messages; database translation tables key on the
 * same codes (Phase 2), so no schema change is needed.
 */
export const locales = ["lo", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "lo";

export const localeConfig: Record<
  Locale,
  { label: string; nativeName: string; htmlLang: string; ogLocale: string }
> = {
  lo: { label: "LO", nativeName: "ພາສາລາວ", htmlLang: "lo", ogLocale: "lo_LA" },
  en: { label: "EN", nativeName: "English", htmlLang: "en", ogLocale: "en_US" },
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
