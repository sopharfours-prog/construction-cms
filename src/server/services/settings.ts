import "server-only";

import { cache } from "react";

import { db } from "@/lib/db/client";
import { settingsSchemas, type SettingsKey, type SettingsValue } from "@/lib/validation/settings";

/**
 * Read one settings group, validated. Returns null when the row is missing or
 * invalid (logged), so callers always choose an explicit fallback.
 * Deduplicated per request with React cache().
 */
export const getSetting = cache(
  async <K extends SettingsKey>(key: K): Promise<SettingsValue<K> | null> => {
    const row = await db.setting.findUnique({ where: { key } });
    if (!row) return null;

    const parsed = settingsSchemas[key].safeParse(row.value);
    if (!parsed.success) {
      console.error(`[settings] stored value for "${key}" is invalid`, parsed.error.issues);
      return null;
    }
    return parsed.data as SettingsValue<K>;
  },
);
