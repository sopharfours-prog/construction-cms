import type { Metadata } from "next";
import Link from "next/link";

import { toAuthLabels } from "@/components/admin/auth/labels";
import { ResetPasswordForm } from "@/components/admin/auth/reset-password-form";
import { Button } from "@/components/ui/button";
import { getMessages } from "@/i18n/messages";
import { getAdminLocale } from "@/i18n/admin-locale";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: getMessages(await getAdminLocale()).auth.reset.title,
    // The token is in the URL: never send it to other sites via Referer.
    referrer: "no-referrer",
  };
}

export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/admin/reset-password">) {
  const { token } = await searchParams;
  const t = getMessages(await getAdminLocale()).auth;
  const validShape = typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);

  return (
    <>
      <h1 className="mb-8 text-3xl type-heading">{t.reset.title}</h1>
      {validShape ? (
        <ResetPasswordForm labels={toAuthLabels(t)} token={token} />
      ) : (
        <div className="grid gap-6">
          <p className="text-muted-foreground">{t.reset.missingToken}</p>
          <Button asChild>
            <Link href="/admin/forgot-password">{t.reset.requestNew}</Link>
          </Button>
        </div>
      )}
    </>
  );
}
