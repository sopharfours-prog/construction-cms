import { defaultLocale, isLocale, locales, type Locale } from "@/config/i18n";

/** Cookie remembering the visitor's language choice (set by the language switcher). */
export const SITE_LOCALE_COOKIE = "site_locale";

/** "/projects/x" → "/en/projects/x". Paths are shared across languages (one slug per item). */
export function localizedPath(locale: Locale, path = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}

/** Current pathname with its language swapped: "/lo/projects/x" → "/en/projects/x". */
export function switchLocalePath(pathname: string, to: Locale): string {
  const [, first, ...rest] = pathname.split("/");
  const tail = first && isLocale(first) ? rest : [first, ...rest].filter(Boolean);
  return localizedPath(to, `/${tail.join("/")}`.replace(/\/$/, "") || "/");
}

/**
 * Best language for a visitor without a locale in the URL: explicit cookie,
 * then Accept-Language (quality-ordered), then the default.
 */
export function pickLocale(cookieValue: string | undefined, acceptLanguage: string | null): Locale {
  if (cookieValue && isLocale(cookieValue)) return cookieValue;
  const ranked = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { base: tag.toLowerCase().split("-")[0] ?? "", q: q ? Number(q.slice(2)) : 1 };
    })
    .filter((x) => x.base && Number.isFinite(x.q) && x.q > 0)
    .sort((a, b) => b.q - a.q);
  return (
    (ranked.find((x) => (locales as readonly string[]).includes(x.base))?.base as
      Locale | undefined) ?? defaultLocale
  );
}
