"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { isLocale } from "@/config/i18n";
import { ADMIN_LOCALE_COOKIE } from "@/i18n/admin-locale";
import { db } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/session";

/** Switch the admin interface language: cookie now, profile for next sign-in. */
export async function setAdminLocaleAction(locale: string): Promise<void> {
  if (!isLocale(locale)) return; // Never trust the client value.

  (await cookies()).set(ADMIN_LOCALE_COOKIE, locale, {
    path: "/admin",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });

  const user = await getCurrentUser();
  if (user) await db.user.update({ where: { id: user.id }, data: { preferredLocale: locale } });

  revalidatePath("/admin", "layout");
}
