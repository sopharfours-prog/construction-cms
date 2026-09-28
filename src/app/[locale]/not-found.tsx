"use client";

import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";

import { StatusScreen } from "@/components/shared/status-screen";
import { Button } from "@/components/ui/button";
import { defaultLocale, isLocale } from "@/config/i18n";
import { getMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";

/** 404 inside the public site, in the language of the URL. */
export default function NotFound() {
  const params = useParams<{ locale?: string }>();
  const locale = params.locale && isLocale(params.locale) ? params.locale : defaultLocale;
  const t = getMessages(locale);
  return (
    <StatusScreen
      code="404"
      title={t.errors.notFoundTitle}
      description={<p>{t.errors.notFoundDescription}</p>}
      actions={
        <Button asChild>
          <Link href={localizedPath(locale, "/") as Route}>{t.common.backHome}</Link>
        </Button>
      }
    />
  );
}
