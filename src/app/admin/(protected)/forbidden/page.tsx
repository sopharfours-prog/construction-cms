import type { Metadata } from "next";
import Link from "next/link";

import { StatusScreen } from "@/components/shared/status-screen";
import { Button } from "@/components/ui/button";
import { getMessages } from "@/i18n/messages";
import { getAdminLocale } from "@/i18n/admin-locale";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getMessages(await getAdminLocale()).auth.forbidden.title };
}

export default async function ForbiddenPage() {
  const t = getMessages(await getAdminLocale()).auth.forbidden;

  return (
    <StatusScreen
      code="403"
      className="min-h-0 py-8"
      title={t.title}
      description={<p>{t.description}</p>}
      actions={
        <Button asChild>
          <Link href="/admin">{t.back}</Link>
        </Button>
      }
    />
  );
}
