import "server-only";

import { cache } from "react";

import { defaultLocale, isLocale, locales, type Locale } from "@/config/i18n";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db/client";
import { settingsSchemas, type SettingsKey, type SettingsValue } from "@/lib/validation/settings";
import { writeAuditLog } from "@/server/services/audit";
import { type ActionContext, ContentError } from "@/server/services/errors";
import { assertImages } from "@/server/services/media/media";

/** Media fields inside settings groups: must point at live images. */
const imageFields: Partial<Record<SettingsKey, string[]>> = {
  general: ["logoMediaId", "faviconMediaId", "heroImageMediaId", "aboutImageMediaId"],
  seo: ["ogImageMediaId"],
};

/** Save one settings group. Validated against the stored schema, audited old → new. */
export async function updateSettings<K extends SettingsKey>(
  key: K,
  value: SettingsValue<K>,
  ctx: ActionContext,
) {
  const parsed = settingsSchemas[key].safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ContentError("validation", issue?.path.join(".") || undefined, "invalid");
  }
  for (const field of imageFields[key] ?? []) {
    const id = (parsed.data as Record<string, unknown>)[field];
    if (typeof id === "string") await assertImages([id], field);
  }

  const previous = await db.setting.findUnique({ where: { key } });
  await db.$transaction(async (tx) => {
    await tx.setting.upsert({
      where: { key },
      create: { key, value: parsed.data as Prisma.InputJsonValue, updatedById: ctx.user.id },
      update: { value: parsed.data as Prisma.InputJsonValue, updatedById: ctx.user.id },
    });
    await writeAuditLog(
      {
        action: "SETTINGS_CHANGE",
        entity: "Setting",
        entityId: key,
        userId: ctx.user.id,
        oldValue: previous?.value ?? undefined,
        newValue: parsed.data as object,
        request: ctx.request,
      },
      tx,
    );
  });
  return { key };
}

export async function listLanguages() {
  const rows = await db.language.findMany({ orderBy: { sortOrder: "asc" } });
  // Only languages the code supports (dictionaries, routes) can be offered.
  return rows
    .filter((r) => isLocale(r.code))
    .map((r) => ({
      code: r.code as Locale,
      name: r.name,
      nativeName: r.nativeName,
      enabled: r.enabled,
      isDefault: r.code === defaultLocale,
    }));
}

/**
 * Languages shown on the public site. The main language is always on:
 * all content is required to have it.
 */
export const getEnabledLocales = cache(async (): Promise<Locale[]> => {
  const rows = await db.language.findMany({ where: { enabled: true }, select: { code: true } });
  const enabled = new Set(rows.map((r) => r.code));
  return locales.filter((l) => l === defaultLocale || enabled.has(l));
});

export async function setLanguageEnabled(code: string, enabled: boolean, ctx: ActionContext) {
  if (!isLocale(code)) throw new ContentError("notFound");
  if (code === defaultLocale && !enabled)
    throw new ContentError("validation", undefined, "defaultLanguageRequired");
  const row = await db.language.findUnique({ where: { code } });
  if (!row) throw new ContentError("notFound");
  if (row.enabled === enabled) return { code };
  await db.$transaction(async (tx) => {
    await tx.language.update({ where: { code }, data: { enabled } });
    await writeAuditLog(
      {
        action: "SETTINGS_CHANGE",
        entity: "Language",
        entityId: code,
        userId: ctx.user.id,
        oldValue: { enabled: row.enabled },
        newValue: { enabled },
        request: ctx.request,
      },
      tx,
    );
  });
  return { code };
}
