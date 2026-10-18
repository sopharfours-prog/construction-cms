import "server-only";

import { cookies } from "next/headers";

import { isLocale } from "@/config/i18n";
import { ADMIN_LOCALE_COOKIE } from "@/i18n/admin-locale";

/** The CMS language for this browser; the profile keeps it for the next sign-in. */
export async function setAdminLocaleCookie(locale: string) {
  if (!isLocale(locale)) return;
  (await cookies()).set(ADMIN_LOCALE_COOKIE, locale, {
    path: "/admin",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}
