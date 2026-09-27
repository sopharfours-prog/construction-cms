import type { Locale } from "@/config/i18n";

import { adminEn, type AdminMessages } from "./en";
import { adminLo } from "./lo";

const dictionaries: Record<Locale, AdminMessages> = { lo: adminLo, en: adminEn };

/** Admin interface strings. Plain strings only, so they can be passed to Client Components. */
export function getAdminMessages(locale: Locale): AdminMessages {
  return dictionaries[locale];
}

export type { AdminMessages };
