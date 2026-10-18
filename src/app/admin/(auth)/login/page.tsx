import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { toAuthLabels } from "@/components/admin/auth/labels";
import { LoginForm } from "@/components/admin/auth/login-form";
import { getMessages } from "@/i18n/messages";
import { getAdminLocale } from "@/i18n/admin-locale";
import { getCurrentUser } from "@/lib/auth/session";
import { safeAdminCallbackUrl } from "@/lib/security/redirect";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getMessages(await getAdminLocale()).auth.login.title };
}

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const params = await searchParams;
  const callbackUrl = safeAdminCallbackUrl(params.callbackUrl);
  // Database-verified: a revoked or expired session stays here and signs in again.
  if (await getCurrentUser()) redirect(callbackUrl);
  const t = getMessages(await getAdminLocale()).auth;

  return (
    <>
      <h1 className="text-2xl type-heading">{t.login.title}</h1>
      <p className="mt-1.5 mb-6 text-sm text-muted-foreground">{t.login.description}</p>
      <LoginForm labels={toAuthLabels(t)} callbackUrl={callbackUrl} />
    </>
  );
}
