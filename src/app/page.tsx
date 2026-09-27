import Link from "next/link";

import { getMessages } from "@/i18n/messages";
import { siteConfig } from "@/config/site";

/**
 * Temporary holding page. Replaced by the localized public home page in Phase 9.
 */
export default function HoldingPage() {
  const lo = getMessages("lo");
  const en = getMessages("en");
  const isDevelopment = process.env.NODE_ENV === "development";

  return (
    <main className="relative flex min-h-dvh flex-col bg-primary text-primary-foreground">
      <div className="container-site flex flex-1 flex-col justify-end pt-24 pb-16 md:pb-24">
        <p className="text-sm text-primary-foreground/70">{siteConfig.fallbackName}</p>
        <h1 className="mt-6 max-w-5xl text-5xl type-display sm:text-6xl md:text-7xl lg:text-8xl">
          {lo.holding.title}
        </h1>
        <p
          lang="en"
          className="mt-4 max-w-3xl text-2xl type-heading text-primary-foreground/80 md:text-3xl"
        >
          {en.holding.title}
        </p>
        <div className="mt-10 grid max-w-3xl gap-2 border-t border-primary-foreground/20 pt-6 text-primary-foreground/80 md:grid-cols-2 md:gap-8">
          <p>{lo.holding.description}</p>
          <p lang="en">{en.holding.description}</p>
        </div>
        {isDevelopment ? (
          <Link
            href="/styleguide"
            className="mt-10 w-fit text-sm text-primary-foreground underline underline-offset-4 hover:text-highlight"
          >
            Open the design system styleguide (development only)
          </Link>
        ) : null}
      </div>
      <div aria-hidden="true" className="h-2 bg-highlight" />
    </main>
  );
}
