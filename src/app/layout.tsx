import type { Metadata, Viewport } from "next";

import { BrandStyle } from "@/components/shared/brand-style";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { defaultLocale, localeConfig } from "@/config/i18n";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

import { archivo, notoSansLao } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.fallbackName,
    template: `%s | ${siteConfig.fallbackName}`,
  },
  robots: { index: false, follow: false }, // Replaced by per-page SEO in Phase 10.
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#131619" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang={localeConfig[defaultLocale].htmlLang}
      className={cn(archivo.variable, notoSansLao.variable)}
      suppressHydrationWarning
    >
      <head>
        <BrandStyle />
      </head>
      <body className="min-h-dvh">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
