import { BrandStyle } from "@/components/shared/brand-style";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

import { archivo, notoSansLao } from "@/app/fonts";

/**
 * The <html> document shared by the public site and the CMS. They are
 * separate root layouts so each can set its own `lang` without reading
 * request headers (which would make every public page dynamic).
 */
export function RootDocument({
  lang,
  children,
  brand,
  defaultTheme = "light",
  nonce,
}: {
  lang: string;
  children: React.ReactNode;
  brand?: unknown;
  defaultTheme?: "light" | "dark" | "system";
  /** CSP nonce for the inline theme script, where the policy has no 'unsafe-inline' (the CMS). */
  nonce?: string;
}) {
  return (
    <html
      lang={lang}
      className={cn(archivo.variable, notoSansLao.variable)}
      suppressHydrationWarning
    >
      {/* App Router root document: <head> is correct here (the rule targets the Pages Router). */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        <BrandStyle tokens={brand} />
      </head>
      <body className="min-h-dvh">
        <ThemeProvider
          attribute="class"
          defaultTheme={defaultTheme}
          enableSystem
          disableTransitionOnChange
          nonce={nonce}
        >
          {children}
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
