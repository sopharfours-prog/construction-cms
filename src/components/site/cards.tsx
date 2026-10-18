import { ArrowUpRightIcon, Building2Icon, CalendarIcon, MapPinIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";

import { ServiceIcon } from "@/components/shared/service-icon";
import type { Locale } from "@/config/i18n";
import type { Messages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  NewsCard as NewsItem,
  ProjectCard as ProjectItem,
  PublicImage,
  ServiceCard as ServiceItem,
} from "@/server/public/content";

const statusStyle = {
  COMPLETED: "bg-success text-success-foreground",
  ONGOING: "bg-highlight text-highlight-foreground",
  UPCOMING: "bg-background/90 text-foreground",
} as const;

export function CoverImage({
  image,
  alt,
  sizes,
  className,
  priority,
}: {
  image: PublicImage | null;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {image ? (
        <Image
          src={image.url}
          alt={image.altText || alt}
          fill
          sizes={sizes}
          priority={priority}
          placeholder={image.blurDataUrl ? "blur" : "empty"}
          blurDataURL={image.blurDataUrl ?? undefined}
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        // No photo yet: a quiet branded panel rather than an empty box.
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center bg-[repeating-linear-gradient(135deg,var(--muted)_0_14px,color-mix(in_oklab,var(--border)_55%,transparent)_14px_15px)]"
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-background/80 text-muted-foreground/60">
            <Building2Icon className="size-6" />
          </span>
        </div>
      )}
    </div>
  );
}

export function ProjectCard({
  project,
  locale,
  t,
  headingLevel = "h3",
  priority,
  lead = false,
}: {
  project: ProjectItem;
  locale: Locale;
  t: Messages["public"];
  headingLevel?: "h2" | "h3";
  priority?: boolean;
  /** Large card that opens a showcase grid: its photo fills the space beside the smaller cards. */
  lead?: boolean;
}) {
  const Heading = headingLevel;
  return (
    <article className="group relative flex h-full flex-col shadow-sm transition-shadow duration-300 hover:shadow-xl">
      <CoverImage
        image={project.cover}
        alt={project.title}
        sizes={
          lead
            ? "(min-width: 1024px) 60vw, 100vw"
            : "(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
        }
        className={
          lead
            ? "aspect-[4/3] md:aspect-[16/9] lg:aspect-auto lg:min-h-72 lg:flex-1"
            : "aspect-[4/3]"
        }
        priority={priority}
      />
      <span
        className={cn(
          "absolute top-4 left-4 px-2.5 py-1 text-xs font-semibold",
          statusStyle[project.status],
        )}
      >
        {t.projects.statuses[project.status]}
      </span>
      <div
        className={cn("flex flex-col border-x border-b bg-card p-5", lead ? "lg:p-7" : "flex-1")}
      >
        <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {[project.category, project.year].filter(Boolean).join(" · ")}
        </p>
        <Heading className={cn("type-heading", lead ? "text-xl lg:text-3xl" : "text-xl")}>
          <Link
            href={localizedPath(locale, `/projects/${project.slug}`) as Route}
            className="after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:ring-2 after:focus-visible:ring-ring"
          >
            {project.title}
          </Link>
        </Heading>
        {lead && project.summary ? (
          <p className="mt-3 line-clamp-2 hidden max-w-2xl text-muted-foreground lg:block">
            {project.summary}
          </p>
        ) : null}
        {project.location ? (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPinIcon className="size-4 shrink-0" aria-hidden="true" />
            {project.location}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export function ServiceCard({
  service,
  locale,
  t,
  index,
  headingLevel = "h3",
}: {
  service: ServiceItem;
  locale: Locale;
  t: Messages["public"];
  index?: number;
  /** h2 when the card list sits directly under the page's h1. */
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  return (
    <article className="group relative flex flex-col border bg-card p-7 transition-colors hover:border-primary">
      {service.cover ? (
        <CoverImage
          image={service.cover}
          alt={service.title}
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
          className="-mx-7 -mt-7 mb-6 aspect-[16/9]"
        />
      ) : null}
      <div className="mb-6 flex items-start justify-between">
        <span className="flex size-12 items-center justify-center bg-primary text-primary-foreground transition-colors group-hover:bg-highlight group-hover:text-highlight-foreground">
          <ServiceIcon name={service.icon} className="size-6" />
        </span>
        {index !== undefined ? (
          <span
            aria-hidden="true"
            className="text-sm font-semibold text-muted-foreground tabular-nums"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
        ) : null}
      </div>
      <Heading className="text-xl type-heading">
        <Link
          href={localizedPath(locale, `/services/${service.slug}`) as Route}
          className="after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:ring-2 after:focus-visible:ring-ring"
        >
          {service.title}
        </Link>
      </Heading>
      {service.description ? (
        <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
          {service.description}
        </p>
      ) : null}
      <span
        aria-hidden="true"
        className="mt-6 flex items-center gap-1 text-sm font-semibold text-primary"
      >
        {t.readMore}
        <ArrowUpRightIcon className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </span>
    </article>
  );
}

export function NewsCard({
  news,
  locale,
  t,
  headingLevel = "h3",
}: {
  news: NewsItem;
  locale: Locale;
  t: Messages["public"];
  /** h2 when the card list sits directly under the page's h1. */
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  return (
    <article className="group relative flex flex-col">
      <CoverImage
        image={news.cover}
        alt={news.title}
        sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
        className="aspect-[16/10]"
      />
      <div className="flex flex-1 flex-col pt-5">
        <p className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {news.category ? <span className="text-highlight-ink">{news.category}</span> : null}
          <span className="flex items-center gap-1">
            <CalendarIcon className="size-3.5" aria-hidden="true" />
            <time dateTime={news.publishedAt.toISOString()}>
              {formatDate(news.publishedAt, locale)}
            </time>
          </span>
        </p>
        <Heading className="text-lg type-heading">
          <Link
            href={localizedPath(locale, `/news/${news.slug}`) as Route}
            className="after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:ring-2 after:focus-visible:ring-ring"
          >
            {news.title}
          </Link>
        </Heading>
        {news.excerpt ? (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {news.excerpt}
          </p>
        ) : null}
        <span className="sr-only">{t.readMore}</span>
      </div>
    </article>
  );
}
