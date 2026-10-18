import type { Metadata } from "next";
import { headers } from "next/headers";
import { connection } from "next/server";

import { RootDocument } from "@/components/shared/root-document";
import { localeConfig } from "@/config/i18n";
import { siteConfig } from "@/config/site";
import { sharedViewport } from "@/config/viewport";
import { getAdminLocale } from "@/i18n/admin-locale";
import { getFavicon } from "@/server/public/site";
import { getSetting } from "@/server/services/settings";

import "../globals.css";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: "Admin", template: "%s | Admin" },
    robots: { index: false, follow: false, nocache: true },
    icons: { icon: [await getFavicon()] },
  };
}

export const viewport = sharedViewport;

/** Root layout of the CMS: the document language follows the admin's language. */
export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  // Always rendered per request (per-request CSP nonce, signed-in user). Waiting
  // here also keeps `next build` from reaching the database, which a Docker
  // build doesn't have.
  await connection();
  const [locale, appearance, requestHeaders] = await Promise.all([
    getAdminLocale(),
    getSetting("appearance"),
    headers(),
  ]);
  return (
    <RootDocument
      lang={localeConfig[locale].htmlLang}
      brand={appearance?.brand}
      defaultTheme={appearance?.defaultTheme}
      // Set by the proxy together with the nonce-based CSP.
      nonce={requestHeaders.get("x-nonce") ?? undefined}
    >
      {children}
    </RootDocument>
  );
}
