import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

import { RootDocument } from "@/components/shared/root-document";
import { StatusScreen } from "@/components/shared/status-screen";
import { Button } from "@/components/ui/button";
import { defaultLocale, localeConfig } from "@/config/i18n";
import { getMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";

import "./globals.css";

export const metadata: Metadata = { title: "404", robots: { index: false } };

/**
 * 404 for URLs outside every root layout (the site and the CMS are separate
 * root layouts). The language is unknown here, so Lao is shown with English.
 */
export default function GlobalNotFound() {
  const lo = getMessages("lo");
  const en = getMessages("en");
  return (
    <RootDocument lang={localeConfig[defaultLocale].htmlLang}>
      <StatusScreen
        code="404"
        title={
          <>
            {lo.errors.notFoundTitle}
            <span lang="en" className="mt-1 block text-lg font-normal text-muted-foreground">
              {en.errors.notFoundTitle}
            </span>
          </>
        }
        description={
          <>
            <p>{lo.errors.notFoundDescription}</p>
            <p lang="en">{en.errors.notFoundDescription}</p>
          </>
        }
        actions={
          <Button asChild>
            <Link href={localizedPath(defaultLocale, "/") as Route}>
              {lo.common.backHome} / <span lang="en">{en.common.backHome}</span>
            </Link>
          </Button>
        }
      />
    </RootDocument>
  );
}
