import type { Locale } from "@/config/i18n";

const intlLocale: Record<Locale, string> = { lo: "lo-LA", en: "en-GB" };

// ─── Lao without Intl data ───────────────────────────────────────────────────
// Some browsers (Google Chrome among them) ship no Lao formatting data and
// silently fall back to English. Where that happens, these produce exactly what
// the server's Intl produces (CLDR Lao), so text formatted in the browser
// matches the page and hydration never disagrees with the server.

const laoSupported = {
  number: Intl.NumberFormat.supportedLocalesOf("lo-LA").length > 0,
  date: Intl.DateTimeFormat.supportedLocalesOf("lo-LA").length > 0,
  relative: Intl.RelativeTimeFormat.supportedLocalesOf("lo-LA").length > 0,
};

const LAO_MONTHS = [
  "ມ.ກ.",
  "ກ.ພ.",
  "ມ.ນ.",
  "ມ.ສ.",
  "ພ.ພ.",
  "ມິ.ຖ.",
  "ກ.ລ.",
  "ສ.ຫ.",
  "ກ.ຍ.",
  "ຕ.ລ.",
  "ພ.ຈ.",
  "ທ.ວ.",
];
const LAO_UNITS = { second: "ວິນາທີ", minute: "ນາທີ", hour: "ຊົ່ວໂມງ", day: "ມື້" } as const;
/** CLDR's words for "numeric: auto" (now, yesterday, …). */
const LAO_SPECIAL: Partial<Record<keyof typeof LAO_UNITS, Record<number, string>>> = {
  second: { 0: "ຕອນນີ້" },
  minute: { 0: "ນາທີນີ້" },
  hour: { 0: "ຊົ່ວໂມງນີ້" },
  day: { [-2]: "ມື້ກ່ອນ", [-1]: "ມື້ວານ", 0: "ມື້ນີ້", 1: "ມື້ອື່ນ", 2: "ມື້ຮື" },
};

/** Lao, formatted without Intl's Lao data. Exported for tests. */
export const laoFallback = {
  /** Grouping "." and decimal ",": 1.234.567,5 */
  number(value: number, maximumFractionDigits?: number): string {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits })
      .formatToParts(value)
      .map((p) => (p.type === "group" ? "." : p.type === "decimal" ? "," : p.value))
      .join("");
  },
  /** "5 ມ.ກ. 2026", or "5 ມ.ກ. 2026, 9:07" with the time (Asia/Vientiane, UTC+7, no DST). */
  date(date: Date, withTime: boolean): string {
    const v = new Date(date.getTime() + 7 * 3600_000);
    const day = `${v.getUTCDate()} ${LAO_MONTHS[v.getUTCMonth()]} ${v.getUTCFullYear()}`;
    if (!withTime) return day;
    return `${day}, ${v.getUTCHours()}:${String(v.getUTCMinutes()).padStart(2, "0")}`;
  },
  relative(value: number, unit: keyof typeof LAO_UNITS): string {
    const special = LAO_SPECIAL[unit]?.[value];
    if (special) return special;
    const amount = `${laoFallback.number(Math.abs(value))} ${LAO_UNITS[unit]}`;
    return value < 0 ? `${amount}ກ່ອນ` : `ໃນອີກ ${amount}`;
  },
};

export function formatNumber(value: number, locale: Locale): string {
  if (locale === "lo" && !laoSupported.number) return laoFallback.number(value);
  return new Intl.NumberFormat(intlLocale[locale]).format(value);
}

/** 1536 → "1.5 KB". Binary units, one decimal above KB. */
export function formatBytes(bytes: number, locale: Locale): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  const digits = unit === 0 ? 0 : 1;
  if (locale === "lo" && !laoSupported.number)
    return `${laoFallback.number(value, digits)} ${units[unit]}`;
  return `${new Intl.NumberFormat(intlLocale[locale], { maximumFractionDigits: digits }).format(value)} ${units[unit]}`;
}

export function formatDateTime(date: Date, locale: Locale): string {
  if (locale === "lo" && !laoSupported.date) return laoFallback.date(date, true);
  return new Intl.DateTimeFormat(intlLocale[locale], {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Vientiane",
  }).format(date);
}

export function formatDate(date: Date, locale: Locale): string {
  if (locale === "lo" && !laoSupported.date) return laoFallback.date(date, false);
  return new Intl.DateTimeFormat(intlLocale[locale], {
    dateStyle: "medium",
    timeZone: "Asia/Vientiane",
  }).format(date);
}

/** "2 hours ago" / "2 ຊົ່ວໂມງກ່ອນ". Falls back to a date after 30 days. */
export function formatRelative(date: Date, locale: Locale, now: Date = new Date()): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  if (abs >= 30 * 86_400) return formatDate(date, locale);

  const [amount, unit]: [number, "second" | "minute" | "hour" | "day"] =
    abs < 60
      ? [seconds, "second"]
      : abs < 3600
        ? [Math.round(seconds / 60), "minute"]
        : abs < 86_400
          ? [Math.round(seconds / 3600), "hour"]
          : [Math.round(seconds / 86_400), "day"];
  if (locale === "lo" && !laoSupported.relative) return laoFallback.relative(amount, unit);
  return new Intl.RelativeTimeFormat(intlLocale[locale], { numeric: "auto" }).format(amount, unit);
}

/** Date → value for <input type="datetime-local"> in Asia/Vientiane (UTC+7, no DST). */
export function toVientianeInput(date: Date | null): string {
  if (!date) return "";
  return new Date(date.getTime() + 7 * 3600_000).toISOString().slice(0, 16);
}
