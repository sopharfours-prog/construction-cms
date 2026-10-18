import { z } from "zod";

import { locales, type Locale } from "@/config/i18n";

import { optionalUuid } from "./content";

/**
 * Form → stored shape for each Website Settings group. Messages are admin
 * dictionary keys; the stored schemas (settings.ts) validate again on save.
 */
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: "tooLong" })
    .optional()
    .transform((v) => v ?? "");

const localized = (max: number, requiredDefault = false) =>
  z
    .object(
      Object.fromEntries(locales.map((l) => [l, text(max)])) as Record<
        Locale,
        ReturnType<typeof text>
      >,
    )
    .partial()
    .optional()
    .transform(
      (v) => Object.fromEntries(locales.map((l) => [l, v?.[l] ?? ""])) as Record<Locale, string>,
    )
    .superRefine((v, ctx) => {
      if (requiredDefault && !v[locales[0]!])
        ctx.addIssue({ code: "custom", path: [locales[0]!], message: "required" });
    });

const nullable = <T extends z.ZodType<string, string>>(schema: T) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(schema.nullable());

const https = z.url({ protocol: /^https$/, error: "urlInvalid" }).max(500, { error: "tooLong" });
const intOrNull = (max: number) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      if (!/^\d{1,6}$/.test(v) || Number(v) > max) {
        ctx.addIssue({ code: "custom", message: "invalid" });
        return z.NEVER;
      }
      return Number(v);
    });
const hex = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^#[0-9a-f]{6}$/, { error: "colorInvalid" });
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "emailInvalid" }));

export const settingsFormSchemas = {
  general: z.object({
    siteName: localized(120, true),
    tagline: localized(200),
    description: localized(500),
    logoMediaId: optionalUuid,
    faviconMediaId: optionalUuid,
    heroImageMediaId: optionalUuid,
    aboutImageMediaId: optionalUuid,
    foundedYear: intOrNull(2100).refine((v) => v === null || v >= 1900, { message: "invalid" }),
  }),
  contact: z.object({
    address: localized(300),
    phones: z
      .string()
      .optional()
      .transform((v) =>
        (v ?? "")
          .split(/\r?\n/)
          .map((p) => p.trim())
          .filter(Boolean),
      )
      .pipe(
        z
          .array(z.string().regex(/^[+0-9 ()-]{6,30}$/, { error: "phoneInvalid" }))
          .max(5, { error: "tooMany" }),
      ),
    email,
    notificationEmail: nullable(z.email({ error: "emailInvalid" })),
    openingHours: localized(200),
    mapEmbedUrl: nullable(
      https.refine((u) => u.startsWith("https://www.google.com/maps/embed"), {
        message: "mapUrlInvalid",
      }),
    ),
  }),
  social: z.object({
    facebook: nullable(https),
    instagram: nullable(https),
    tiktok: nullable(https),
    youtube: nullable(https),
    linkedin: nullable(https),
  }),
  seo: z.object({
    defaultTitle: localized(70),
    defaultDescription: localized(170),
    ogImageMediaId: optionalUuid,
    googleAnalyticsId: nullable(
      z
        .string()
        .toUpperCase()
        .regex(/^G-[A-Z0-9]+$/, { error: "gaInvalid" }),
    ),
    googleSiteVerification: nullable(
      z.string().regex(/^[A-Za-z0-9_-]{10,100}$/, { error: "invalid" }),
    ),
  }),
  appearance: z.object({
    brand: z.object({ primary: hex, primaryForeground: hex, accent: hex, accentForeground: hex }),
    defaultTheme: z.enum(["light", "dark", "system"], { error: "invalid" }),
  }),
  statistics: z.object({
    yearsOfExperience: intOrNull(200),
    clients: intOrNull(1_000_000),
    teamMembers: intOrNull(1_000_000),
  }),
} as const;

export type SettingsFormKey = keyof typeof settingsFormSchemas;
