import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { toAuthLabels } from "@/components/admin/auth/labels";
import { RegisterForm } from "@/components/admin/auth/register-form";
import { getAdminLocale } from "@/i18n/admin-locale";
import { getMessages } from "@/i18n/messages";
import { getServerEnv } from "@/lib/env/server";
import { createFormToken } from "@/lib/security/form-token";
import { isRegistrationOpen } from "@/server/services/auth/registration";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getMessages(await getAdminLocale()).auth.register.title };
}

/** Public: ask for a staff account. Nothing here grants access; an administrator approves. */
export default async function RegisterPage() {
  if (!isRegistrationOpen()) notFound();
  const t = getMessages(await getAdminLocale()).auth;

  return (
    <>
      <h1 className="text-2xl type-heading">{t.register.title}</h1>
      <p className="mt-1.5 mb-6 text-sm text-muted-foreground">{t.register.description}</p>
      {/* Rendered per request, so the anti-spam token is always fresh. */}
      <RegisterForm
        labels={toAuthLabels(t)}
        formToken={createFormToken(getServerEnv().AUTH_SECRET)}
      />
    </>
  );
}
