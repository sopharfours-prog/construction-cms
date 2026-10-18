import { z } from "zod";

import { brandTokensSchema } from "@/lib/theme/brand";

/**
 * Website Settings schemas. Each key of the `settings` table stores one group,
 * validated here on every write (and on read, falling back to defaults).
 */

const localeCode = z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, "Invalid locale code");

/** Text per language, e.g. { lo: "…", en: "…" }. Keys are locale codes. */
export const localizedText = (max: number) => z.record(localeCode, z.string().trim().max(max));

const httpsUrl = z.url({ protocol: /^https$/, message: "Must be an https:// URL" });
const nullableHttpsUrl = httpsUrl.nullable();
const mediaId = z.uuid().nullable();

export const generalSettingsSchema = z.object({
  siteName: localizedText(120),
  /** Home page headline; falls back to the site name. */
  tagline: localizedText(200).default({}),
  description: localizedText(500),
  logoMediaId: mediaId,
  faviconMediaId: mediaId,
  /** Large photo behind the home page headline (else the first featured project's cover). */
  heroImageMediaId: mediaId.default(null),
  /** Photo beside "About us" on the home page. */
  aboutImageMediaId: mediaId.default(null),
  foundedYear: z.number().int().min(1900).max(2100).nullable(),
});

export const contactSettingsSchema = z.object({
  address: localizedText(300),
  phones: z
    .array(
      z
        .string()
        .trim()
        .regex(/^[+0-9 ()-]{6,30}$/, "Invalid phone number"),
    )
    .max(5),
  /** Internal address for new-request notifications; falls back to `email`. */
  notificationEmail: z.email().nullable().default(null),
  email: z.email(),
  openingHours: localizedText(200),
  /** Only Google Maps embed URLs, since the value is used as an iframe src. */
  mapEmbedUrl: httpsUrl
    .refine((url) => url.startsWith("https://www.google.com/maps/embed"), {
      message: "Must be a Google Maps embed URL (https://www.google.com/maps/embed?…)",
    })
    .nullable(),
});

export const socialSettingsSchema = z.object({
  facebook: nullableHttpsUrl,
  instagram: nullableHttpsUrl,
  tiktok: nullableHttpsUrl,
  youtube: nullableHttpsUrl,
  linkedin: nullableHttpsUrl,
});

export const seoSettingsSchema = z.object({
  defaultTitle: localizedText(70),
  defaultDescription: localizedText(170),
  ogImageMediaId: mediaId,
  googleAnalyticsId: z
    .string()
    .regex(/^G-[A-Z0-9]+$/, "Expected a GA4 measurement ID such as G-XXXXXXX")
    .nullable(),
  googleSiteVerification: z
    .string()
    .regex(/^[A-Za-z0-9_-]{10,100}$/)
    .nullable(),
});

export const appearanceSettingsSchema = z.object({
  brand: brandTokensSchema,
  defaultTheme: z.enum(["light", "dark", "system"]),
});

/** Figures for the home-page statistics band. Project count is computed live. */
export const statisticsSettingsSchema = z.object({
  yearsOfExperience: z.number().int().min(0).max(200).nullable(),
  clients: z.number().int().min(0).nullable(),
  teamMembers: z.number().int().min(0).nullable(),
});

export const settingsSchemas = {
  general: generalSettingsSchema,
  contact: contactSettingsSchema,
  social: socialSettingsSchema,
  seo: seoSettingsSchema,
  appearance: appearanceSettingsSchema,
  statistics: statisticsSettingsSchema,
} as const;

export type SettingsKey = keyof typeof settingsSchemas;
export type SettingsValue<K extends SettingsKey> = z.infer<(typeof settingsSchemas)[K]>;
