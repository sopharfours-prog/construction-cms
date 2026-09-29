import { z } from "zod";

import { defaultLocale, locales, type Locale } from "@/config/i18n";
import { SLUG_PATTERN } from "@/lib/content/slug";

/** Validation messages are keys into the admin dictionary (`validation.*`). */
export const slugField = z
  .string({ error: "required" })
  .trim()
  .toLowerCase()
  .min(1, { error: "required" })
  .max(200, { error: "tooLong" })
  .regex(SLUG_PATTERN, { error: "slugInvalid" });

/** Optional text: "" becomes null. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: "tooLong" })
    .optional()
    .transform((v) => (v ? v : null));

export const requiredText = (max: number) =>
  z
    .string({ error: "required" })
    .trim()
    .min(1, { error: "required" })
    .max(max, { error: "tooLong" });

export const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
  .optional()
  .transform((v) => v === "on" || v === "true");

/** <input type="date"> value → Date (UTC midnight) or null. */
export const optionalDate = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      ctx.addIssue({ code: "custom", message: "dateInvalid" });
      return z.NEVER;
    }
    const date = new Date(`${v}T00:00:00Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== v) {
      ctx.addIssue({ code: "custom", message: "dateInvalid" });
      return z.NEVER;
    }
    return date;
  });

/** <input type="datetime-local"> in Asia/Vientiane (UTC+7, no DST) → Date or null. */
export const optionalLocalDateTime = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) {
      ctx.addIssue({ code: "custom", message: "dateInvalid" });
      return z.NEVER;
    }
    const date = new Date(`${v}:00+07:00`);
    // Reject values JavaScript would silently roll over (2026-02-30 → March 2).
    const roundTrip = Number.isNaN(date.getTime())
      ? ""
      : new Date(date.getTime() + 7 * 3600_000).toISOString().slice(0, 16);
    if (roundTrip !== v) {
      ctx.addIssue({ code: "custom", message: "dateInvalid" });
      return z.NEVER;
    }
    return date;
  });

/** Money amount as a decimal string (Prisma Decimal), max 2 decimals, non-negative. */
export const optionalAmount = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const normalized = v.replace(/[\s,]/g, "");
    if (!/^\d{1,16}(\.\d{1,2})?$/.test(normalized)) {
      ctx.addIssue({ code: "custom", message: "amountInvalid" });
      return z.NEVER;
    }
    return normalized;
  });

export const currencyField = z.enum(["LAK", "USD", "THB"]).catch("LAK");

/** Repeated form field or indexed object → array. */
export const listOf = <T extends z.ZodType>(item: T, max: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === "") return [];
      if (Array.isArray(value)) return value;
      if (typeof value === "object" && value !== null) return Object.values(value);
      return [value];
    },
    z.array(item).max(max, { error: "tooMany" }),
  );

type Shape = Record<string, z.ZodType>;

/**
 * Per-locale fields. The default locale needs `requiredKey`; other locales
 * are optional, but once any of their fields is filled, `requiredKey` is
 * required too. Locales left completely empty are dropped (the public site
 * falls back to the default language).
 */
export function translationsSchema<S extends Shape>(shape: S, requiredKey: keyof S & string) {
  const entry = z.object(shape);
  type Entry = z.output<typeof entry>;

  return z
    .object(
      Object.fromEntries(locales.map((l) => [l, entry.optional()])) as Record<
        Locale,
        z.ZodOptional<typeof entry>
      >,
      { error: "required" },
    )
    .superRefine((value, ctx) => {
      for (const locale of locales) {
        const t = value[locale] as Record<string, unknown> | undefined;
        const filled =
          t &&
          Object.values(t).some(
            (v) =>
              v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0),
          );
        if ((locale === defaultLocale || filled) && !t?.[requiredKey]) {
          ctx.addIssue({ code: "custom", path: [locale, requiredKey], message: "required" });
        }
      }
    })
    .transform((value) => {
      const out: Partial<Record<Locale, Entry>> = {};
      for (const locale of locales) {
        const t = value[locale] as Entry | undefined;
        if (t && (t as Record<string, unknown>)[requiredKey]) out[locale] = t;
      }
      return out;
    });
}

/** Text allowed in the requiredKey position of a translation (optional at schema level). */
export const titleField = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: "tooLong" })
    .optional()
    .transform((v) => v ?? "");

export const seoFields = {
  seoTitle: optionalText(70),
  seoDescription: optionalText(170),
};

/** Optional id from a select or hidden input: "" becomes null. */
export const optionalUuid = z
  .string()
  .optional()
  .transform((v) => v || null)
  .pipe(z.uuid({ error: "invalid" }).nullable());

const galleryText = z.object({ altText: optionalText(255), caption: optionalText(500) });

/** Ordered images with per-language alt text and captions; duplicates are dropped. */
export const galleryField = listOf(
  z.object({
    mediaId: z.uuid({ error: "invalid" }),
    translations: z
      .object(
        Object.fromEntries(locales.map((l) => [l, galleryText.optional()])) as Record<
          Locale,
          z.ZodOptional<typeof galleryText>
        >,
      )
      .optional(),
  }),
  60,
).transform((items) =>
  items.filter((item, index) => items.findIndex((x) => x.mediaId === item.mediaId) === index),
);
