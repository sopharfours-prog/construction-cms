import "server-only";

import { cookies } from "next/headers";

import { defaultLocale, isLocale, type Locale } from "@/config/i18n";

export const ADMIN_LOCALE_COOKIE = "admin_locale";

/** Language of the admin interface: the admin's saved choice, else the default. */
export async function getAdminLocale(): Promise<Locale> {
  const value = (await cookies()).get(ADMIN_LOCALE_COOKIE)?.value;
  return value && isLocale(value) ? value : defaultLocale;
}
