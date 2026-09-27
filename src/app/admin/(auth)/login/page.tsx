import type { Metadata } from "next";

import { toAuthLabels } from "@/components/admin/auth/labels";
import { LoginForm } from "@/components/admin/auth/login-form";
import { getMessages } from "@/i18n/messages";
import { getAdminLocale } from "@/i18n/admin-locale";
import { safeAdminCallbackUrl } from "@/lib/security/redirect";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getMessages(await getAdminLocale()).auth.login.title };
}

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const params = await searchParams;
  const t = getMessages(await getAdminLocale()).auth;

  return (
    <>
      <h1 className="text-3xl type-heading">{t.login.title}</h1>
      <p className="mt-2 mb-8 text-muted-foreground">{t.login.description}</p>
      <LoginForm labels={toAuthLabels(t)} callbackUrl={safeAdminCallbackUrl(params.callbackUrl)} />
    </>
  );
}
