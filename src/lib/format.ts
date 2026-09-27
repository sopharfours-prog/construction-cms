import type { Locale } from "@/config/i18n";

const intlLocale: Record<Locale, string> = { lo: "lo-LA", en: "en-GB" };

export function formatNumber(value: number, locale: Locale): string {
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
  return `${new Intl.NumberFormat(intlLocale[locale], { maximumFractionDigits: digits }).format(value)} ${units[unit]}`;
}

export function formatDateTime(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Vientiane",
  }).format(date);
}

export function formatDate(date: Date, locale: Locale): string {
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

  const rtf = new Intl.RelativeTimeFormat(intlLocale[locale], { numeric: "auto" });
  if (abs < 60) return rtf.format(seconds, "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), "hour");
  return rtf.format(Math.round(seconds / 86_400), "day");
}
