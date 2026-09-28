import { ArrowLeftIcon } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CoverImage, NewsCard } from "@/components/site/cards";
import { Breadcrumbs, SectionHeading } from "@/components/site/page-hero";
import { RichText } from "@/components/site/rich-text";
import { isLocale } from "@/config/i18n";
import { fmt } from "@/i18n/format";
import { getMessages } from "@/i18n/messages";
import { localizedPath } from "@/i18n/routing";
import { formatDate } from "@/lib/format";
import { getPublicNews } from "@/server/public/content";
import { pageMetadata } from "@/lib/seo/metadata";
import { articleLd, breadcrumbLd, JsonLd } from "@/lib/seo/json-ld";
import { getSiteShell } from "@/server/public/site";
import { absoluteUrl } from "@/lib/seo/metadata";

type Props = PageProps<"/[locale]/news/[slug]">;

/** Rendered on first visit, then cached and refreshed when the CMS changes content. */
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const [news, shell] = await Promise.all([getPublicNews(slug, locale), getSiteShell(locale)]);
  if (!news) return {};
  return pageMetadata({
    locale,
    path: `/news/${news.slug}`,
    title: news.seo.title || news.title,
    description: news.seo.description || news.excerpt,
    image: news.seo.image ?? shell.seo.ogImage,
    type: "article",
    publishedTime: news.publishedAt,
    modifiedTime: news.updatedAt,
    siteName: shell.name,
  });
}

export default async function NewsArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const news = await getPublicNews(slug, locale);
  if (!news) notFound();
  const t = getMessages(locale);
  const n = t.public.news;
  const base = localizedPath(locale, "/news");

  const pageUrl = localizedPath(locale, `/news/${news.slug}`);
  return (
    <article>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: t.site.nav.home, path: localizedPath(locale, "/") },
            { name: n.title, path: base },
            { name: news.title, path: pageUrl },
          ]),
          articleLd({
            url: absoluteUrl(pageUrl),
            title: news.title,
            description: news.excerpt,
            image: news.seo.image?.url,
            publishedAt: news.publishedAt,
            modifiedAt: news.updatedAt,
            author: news.author,
            orgUrl: absoluteUrl(localizedPath(locale, "/")),
            locale,
          }),
        ]}
      />
      <header className="container-site max-w-4xl pt-10 pb-8 lg:pt-14">
        <Breadcrumbs
          label={t.public.breadcrumb}
          className="mb-8 text-muted-foreground"
          items={[
            { href: localizedPath(locale, "/"), label: t.site.nav.home },
            { href: base, label: n.title },
            { label: news.title },
          ]}
        />
        {news.category ? (
          <Link
            href={`${base}?category=${news.category.slug}` as Route}
            className="text-sm font-semibold tracking-widest text-highlight uppercase hover:underline"
          >
            {news.category.name}
          </Link>
        ) : null}
        <h1 className="mt-3 text-4xl type-display text-balance sm:text-5xl">{news.title}</h1>
        <p className="mt-5 text-sm text-muted-foreground">
          <time dateTime={news.publishedAt.toISOString()}>
            {fmt(n.publishedOn, { date: formatDate(news.publishedAt, locale) })}
          </time>
          {news.author ? <> · {fmt(n.by, { author: news.author })}</> : null}
        </p>
      </header>
      {news.cover ? (
        <div className="container-site max-w-5xl">
          <CoverImage
            image={news.cover}
            alt={news.title}
            sizes="(min-width: 1024px) 64rem, 100vw"
            className="aspect-[16/9]"
            priority
          />
        </div>
      ) : null}
      <div className="container-site max-w-3xl py-12 lg:py-16">
        {news.excerpt ? (
          <p className="mb-8 text-xl leading-relaxed font-medium">{news.excerpt}</p>
        ) : null}
        <RichText doc={news.content} />
        {news.tags.length ? (
          <div className="mt-12 flex flex-wrap items-center gap-2 border-t pt-6">
            <span className="text-sm font-semibold">{n.tags}:</span>
            {news.tags.map((tag) => (
              <Link
                key={tag.slug}
                href={`${base}?tag=${tag.slug}` as Route}
                className="border px-3 py-1 text-sm hover:border-primary"
              >
                {tag.name}
              </Link>
            ))}
          </div>
        ) : null}
        <Link
          href={base as Route}
          className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          {n.back}
        </Link>
      </div>
      {news.more.length ? (
        <section className="bg-muted/50 py-16" aria-labelledby="more-news">
          <div className="container-site">
            <SectionHeading title={n.latest} id="more-news" />
            <div className="grid gap-10 md:grid-cols-3">
              {news.more.map((item) => (
                <NewsCard key={item.slug} news={item} locale={locale} t={t.public} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </article>
  );
}
