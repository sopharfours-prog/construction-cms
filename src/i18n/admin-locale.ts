import "server-only";

import { cookies } from "next/headers";

import { defaultLocale, isLocale, type Locale } from "@/config/i18n";
import { getCurrentUser } from "@/lib/auth/session";

export const ADMIN_LOCALE_COOKIE = "admin_locale";

/**
 * Language of the admin interface: this browser's choice (cookie), else the
 * signed-in user's saved preference, else the site default.
 */
export async function getAdminLocale(): Promise<Locale> {
  const cookie = (await cookies()).get(ADMIN_LOCALE_COOKIE)?.value;
  if (cookie && isLocale(cookie)) return cookie;

  const preferred = (await getCurrentUser())?.preferredLocale;
  return preferred && isLocale(preferred) ? preferred : defaultLocale;
}
