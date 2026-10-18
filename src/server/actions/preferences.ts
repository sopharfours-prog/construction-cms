"use server";

import { revalidatePath } from "next/cache";

import { isLocale } from "@/config/i18n";
import { setAdminLocaleCookie } from "@/i18n/admin-locale-cookie";
import { db } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/session";

/** Switch the admin interface language: cookie now, profile for next sign-in. */
export async function setAdminLocaleAction(locale: string): Promise<void> {
  if (!isLocale(locale)) return; // Never trust the client value.

  await setAdminLocaleCookie(locale);

  const user = await getCurrentUser();
  if (user) await db.user.update({ where: { id: user.id }, data: { preferredLocale: locale } });

  revalidatePath("/admin", "layout");
}
