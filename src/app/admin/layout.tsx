import type { Metadata } from "next";

import { RootDocument } from "@/components/shared/root-document";
import { localeConfig } from "@/config/i18n";
import { siteConfig } from "@/config/site";
import { sharedViewport } from "@/config/viewport";
import { getAdminLocale } from "@/i18n/admin-locale";

import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false, follow: false, nocache: true },
};

export const viewport = sharedViewport;

/** Root layout of the CMS: the document language follows the admin's language. */
export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getAdminLocale();
  return <RootDocument lang={localeConfig[locale].htmlLang}>{children}</RootDocument>;
}
