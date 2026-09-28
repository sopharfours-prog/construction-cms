import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { cn } from "@/lib/utils";

export type Crumb = { href?: string; label: string };

export function Breadcrumbs({
  items,
  label,
  className,
}: {
  items: Crumb[];
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 ? <ChevronRightIcon className="size-3.5 opacity-50" aria-hidden="true" /> : null}
            {item.href && i < items.length - 1 ? (
              <Link href={item.href as Route} className="opacity-75 transition hover:opacity-100">
                {item.label}
              </Link>
            ) : (
              <span
                aria-current={i === items.length - 1 ? "page" : undefined}
                className="line-clamp-1"
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Title band at the top of inner pages. */
export function PageHero({
  title,
  intro,
  crumbs,
  crumbLabel,
  eyebrow,
  children,
  className,
}: {
  title: string;
  intro?: string | null;
  crumbs: Crumb[];
  crumbLabel: string;
  eyebrow?: string | null;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("relative overflow-hidden bg-primary text-primary-foreground", className)}
    >
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 hidden w-1/3 bg-[repeating-linear-gradient(135deg,transparent_0_22px,rgb(255_255_255/0.04)_22px_23px)] lg:block"
      />
      <div className="relative container-site py-12 md:py-16 lg:py-20">
        <Breadcrumbs
          items={crumbs}
          label={crumbLabel}
          className="mb-8 text-primary-foreground/80"
        />
        {eyebrow ? (
          <p className="mb-3 text-sm font-semibold tracking-widest text-highlight uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="max-w-4xl text-4xl type-display text-balance sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        {intro ? (
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-primary-foreground/80">
            {intro}
          </p>
        ) : null}
        {children}
      </div>
      <div aria-hidden="true" className="h-1.5 bg-highlight" />
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  action,
  className,
  id,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      className={cn(
        "mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="mb-3 flex items-center gap-3 text-sm font-semibold tracking-widest text-highlight uppercase">
            <span aria-hidden="true" className="h-px w-8 bg-highlight" />
            {eyebrow}
          </p>
        ) : null}
        <h2 id={id} className="text-3xl type-heading text-balance md:text-4xl">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}
