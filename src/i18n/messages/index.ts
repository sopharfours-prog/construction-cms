import type { Locale } from "@/config/i18n";

import { en, type Messages } from "./en";
import { lo } from "./lo";

const dictionaries: Record<Locale, Messages> = { lo, en };

/** UI strings for a locale. Content strings come from the database, not here. */
export function getMessages(locale: Locale): Messages {
  return dictionaries[locale];
}

export type { Messages };
