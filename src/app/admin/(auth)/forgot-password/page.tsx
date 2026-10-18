import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/admin/auth/forgot-password-form";
import { toAuthLabels } from "@/components/admin/auth/labels";
import { getMessages } from "@/i18n/messages";
import { getAdminLocale } from "@/i18n/admin-locale";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getMessages(await getAdminLocale()).auth.forgot.title };
}

export default async function ForgotPasswordPage() {
  const t = getMessages(await getAdminLocale()).auth;

  return (
    <>
      <h1 className="text-2xl type-heading">{t.forgot.title}</h1>
      <p className="mt-1.5 mb-6 text-sm text-muted-foreground">{t.forgot.description}</p>
      <ForgotPasswordForm labels={toAuthLabels(t)} />
    </>
  );
}
