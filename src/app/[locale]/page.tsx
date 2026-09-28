import { notFound } from "next/navigation";

import { isLocale } from "@/config/i18n";
import { getMessages } from "@/i18n/messages";

/** Temporary home page; the full home page is built in Phase 9. */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getMessages(locale);
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="container-site py-24 md:py-32">
        <h1 className="max-w-4xl text-5xl type-display sm:text-6xl md:text-7xl">
          {t.holding.title}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-primary-foreground/80">{t.holding.description}</p>
      </div>
      <div aria-hidden="true" className="h-2 bg-highlight" />
    </section>
  );
}
