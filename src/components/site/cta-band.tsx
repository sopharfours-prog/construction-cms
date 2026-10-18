import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { Button } from "@/components/ui/button";

export function CtaBand({
  title,
  text,
  primary,
  secondary,
}: {
  title: string;
  text: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <section className="bg-highlight text-highlight-foreground" aria-labelledby="cta-title">
      <div className="container-site flex flex-col gap-8 py-14 md:flex-row md:items-center md:justify-between lg:py-16">
        <div className="max-w-2xl">
          <h2 id="cta-title" className="text-3xl type-heading md:text-4xl">
            {title}
          </h2>
          <p className="mt-3 text-lg opacity-85">{text}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link href={primary.href as Route}>
              {primary.label}
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
          {secondary ? (
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-current bg-transparent text-highlight-foreground hover:bg-black/5 hover:text-highlight-foreground dark:border-current dark:bg-transparent dark:hover:bg-black/5"
            >
              <Link href={secondary.href as Route}>{secondary.label}</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
