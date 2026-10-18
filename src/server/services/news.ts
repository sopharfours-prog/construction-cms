import "server-only";

import { z } from "zod";

import type { Locale } from "@/config/i18n";
import { ContentStatus, type Prisma } from "@/generated/prisma/client";
import { pageParam, paginate, stringParam } from "@/lib/admin/list-params";
import { hasPermission } from "@/lib/auth/permissions";
import { deletedSlug } from "@/lib/content/slug";
import { db } from "@/lib/db/client";
import type { NewsInput } from "@/lib/validation/news";
import { assertImages, pickedMediaSelect } from "@/server/services/media/media";
import { writeAuditLog } from "@/server/services/audit";
import { type ActionContext, ContentError } from "@/server/services/errors";

import { jsonOrNull, pickTranslation, presentLocales } from "./content/translations";

export const newsListSchema = z.object({
  page: pageParam,
  q: stringParam(200),
  status: z.enum(ContentStatus).optional().catch(undefined),
  category: z.uuid().optional().catch(undefined),
  sort: z.enum(["published", "updated"]).catch("published"),
});
export type NewsListFilters = z.infer<typeof newsListSchema>;

export async function listNews(filters: NewsListFilters, locale: Locale) {
  const where: Prisma.NewsWhereInput = {
    deletedAt: null,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.category ? { categoryId: filters.category } : {}),
    ...(filters.q
      ? {
          OR: [
            { slug: { contains: filters.q, mode: "insensitive" } },
            { translations: { some: { title: { contains: filters.q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
  const total = await db.news.count({ where });
  const { page, pageCount, skip, take } = paginate(total, filters.page);
  const rows = await db.news.findMany({
    where,
    orderBy:
      filters.sort === "updated"
        ? [{ updatedAt: "desc" }]
        : [{ publishedAt: { sort: "desc", nulls: "first" } }, { updatedAt: "desc" }],
    skip,
    take,
    select: {
      id: true,
      slug: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
      author: { select: { name: true } },
      translations: { select: { locale: true, title: true } },
      category: { select: { translations: { select: { locale: true, name: true } } } },
    },
  });
  return {
    total,
    page,
    pageCount,
    rows: rows.map((r) => ({
      id: r.id,
      status: r.status,
      publishedAt: r.publishedAt,
      updatedAt: r.updatedAt,
      author: r.author?.name ?? null,
      title: pickTranslation(r.translations, locale)?.title ?? r.slug,
      category: r.category
        ? (pickTranslation(r.category.translations, locale)?.name ?? null)
        : null,
    })),
  };
}

export async function getNewsFormOptions(locale: Locale) {
  const [categories, tags] = await Promise.all([
    db.category.findMany({
      where: { type: "NEWS" },
      orderBy: { sortOrder: "asc" },
      select: { id: true, translations: { select: { locale: true, name: true } } },
    }),
    db.tag.findMany({
      orderBy: { slug: "asc" },
      select: { id: true, translations: { select: { locale: true, name: true } } },
    }),
  ]);
  return {
    categories: categories.map((c) => ({
      id: c.id,
      name: pickTranslation(c.translations, locale)?.name ?? "",
    })),
    tags: tags.map((t) => ({
      id: t.id,
      name: pickTranslation(t.translations, locale)?.name ?? "",
    })),
  };
}

export function getNewsForEdit(id: string) {
  return db.news.findFirst({
    where: { id, deletedAt: null },
    include: {
      translations: true,
      tags: { select: { tagId: true } },
      coverImage: { select: pickedMediaSelect },
      seoImage: { select: pickedMediaSelect },
    },
  });
}

/** Anything other than keeping a draft a draft needs news.publish. */
function assertPublishAllowed(ctx: ActionContext, from: string | null, to: string) {
  const changes = (from ?? "DRAFT") !== to;
  if (changes && !hasPermission(ctx.user, "news.publish"))
    throw new ContentError("validation", "status", "publishNotAllowed");
}

async function assertSlugFree(slug: string, exceptId?: string) {
  const clash = await db.news.findFirst({
    where: { slug, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  if (clash) throw new ContentError("conflict", "slug", "slugTaken");
}

/** PUBLISHED without a date gets "now"; drafts keep no date. */
const toMinute = (date: Date) => Math.floor(date.getTime() / 60_000);

/**
 * Scheduling needs a future time. Only a new or changed schedule is checked:
 * an article whose scheduled time has passed is already live, and editing it
 * (fixing a typo, adding a photo) keeps that time. The form sends minutes.
 */
function assertScheduleInFuture(
  input: NewsInput,
  existing: { status: string; publishedAt: Date | null } | null,
) {
  if (input.status !== "SCHEDULED" || !input.publishedAt) return;
  if (input.publishedAt.getTime() > Date.now()) return;
  const unchanged =
    existing?.status === "SCHEDULED" &&
    existing.publishedAt !== null &&
    toMinute(existing.publishedAt) === toMinute(input.publishedAt);
  if (!unchanged) throw new ContentError("validation", "publishedAt", "scheduleInPast");
}

function resolvePublishedAt(input: NewsInput, previous: Date | null): Date | null {
  if (input.status === "DRAFT") return null;
  if (input.status === "PUBLISHED") return input.publishedAt ?? previous ?? new Date();
  return input.publishedAt ?? previous;
}

function translationData(input: NewsInput) {
  return presentLocales(input.translations).map((locale) => {
    const t = input.translations[locale]!;
    return {
      locale,
      title: t.title,
      excerpt: t.excerpt,
      content: jsonOrNull(t.content),
      seoTitle: t.seoTitle,
      seoDescription: t.seoDescription,
    };
  });
}

const titles = (input: NewsInput) =>
  Object.fromEntries(Object.entries(input.translations).map(([l, t]) => [l, t!.title]));
const auditAction = (from: string, to: string) =>
  from === to
    ? "UPDATE"
    : to === "PUBLISHED" || to === "SCHEDULED"
      ? "PUBLISH"
      : from === "PUBLISHED"
        ? "UNPUBLISH"
        : "STATUS_CHANGE";

export async function createNews(input: NewsInput, ctx: ActionContext) {
  assertPublishAllowed(ctx, null, input.status);
  assertScheduleInFuture(input, null);
  await assertSlugFree(input.slug);
  if (input.coverImageId) await assertImages([input.coverImageId], "coverImageId");
  if (input.seoImageId) await assertImages([input.seoImageId], "seoImageId");
  return db.$transaction(async (tx) => {
    const news = await tx.news.create({
      data: {
        slug: input.slug,
        coverImageId: input.coverImageId,
        seoImageId: input.seoImageId,
        categoryId: input.categoryId,
        authorId: ctx.user.id,
        status: input.status,
        publishedAt: resolvePublishedAt(input, null),
        translations: { create: translationData(input) },
        tags: { create: input.tagIds.map((tagId) => ({ tagId })) },
      },
    });
    await writeAuditLog(
      {
        action: "CREATE",
        entity: "News",
        entityId: news.id,
        userId: ctx.user.id,
        newValue: {
          slug: news.slug,
          status: news.status,
          publishedAt: news.publishedAt,
          titles: titles(input),
        },
        request: ctx.request,
      },
      tx,
    );
    return { id: news.id };
  });
}

export async function updateNews(id: string, input: NewsInput, ctx: ActionContext) {
  const existing = await db.news.findFirst({
    where: { id, deletedAt: null },
    include: { translations: { select: { locale: true, title: true } } },
  });
  if (!existing) throw new ContentError("notFound");
  assertPublishAllowed(ctx, existing.status, input.status);
  if (hasPermission(ctx.user, "news.publish")) assertScheduleInFuture(input, existing);
  await assertSlugFree(input.slug, id);
  if (input.coverImageId) await assertImages([input.coverImageId], "coverImageId");
  if (input.seoImageId) await assertImages([input.seoImageId], "seoImageId");
  const locales = presentLocales(input.translations);
  // Without news.publish the status can't change (checked above), and neither can
  // the publication date: a future date would take a live article off the website.
  const publishedAt = hasPermission(ctx.user, "news.publish")
    ? resolvePublishedAt(input, existing.publishedAt)
    : existing.publishedAt;

  return db.$transaction(async (tx) => {
    const news = await tx.news.update({
      where: { id },
      data: {
        slug: input.slug,
        coverImageId: input.coverImageId,
        seoImageId: input.seoImageId,
        categoryId: input.categoryId,
        status: input.status,
        publishedAt,
      },
    });
    await tx.newsTranslation.deleteMany({ where: { newsId: id, locale: { notIn: locales } } });
    for (const t of translationData(input)) {
      await tx.newsTranslation.upsert({
        where: { newsId_locale: { newsId: id, locale: t.locale } },
        create: { ...t, newsId: id },
        update: t,
      });
    }
    await tx.newsTag.deleteMany({ where: { newsId: id } });
    if (input.tagIds.length)
      await tx.newsTag.createMany({
        data: input.tagIds.map((tagId) => ({ newsId: id, tagId })),
        skipDuplicates: true,
      });
    await writeAuditLog(
      {
        action: auditAction(existing.status, news.status),
        entity: "News",
        entityId: id,
        userId: ctx.user.id,
        oldValue: {
          slug: existing.slug,
          status: existing.status,
          publishedAt: existing.publishedAt,
          titles: Object.fromEntries(existing.translations.map((t) => [t.locale, t.title])),
        },
        newValue: {
          slug: news.slug,
          status: news.status,
          publishedAt: news.publishedAt,
          titles: titles(input),
        },
        request: ctx.request,
      },
      tx,
    );
    return { id };
  });
}

export async function setNewsStatus(
  id: string,
  status: "PUBLISHED" | "DRAFT" | "ARCHIVED",
  ctx: ActionContext,
) {
  const existing = await db.news.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ContentError("notFound");
  if (existing.status === status) return { id };
  await db.$transaction(async (tx) => {
    await tx.news.update({
      where: { id },
      data: {
        status,
        publishedAt:
          status === "DRAFT"
            ? null
            : status === "PUBLISHED"
              ? existing.publishedAt && existing.publishedAt <= new Date()
                ? existing.publishedAt
                : new Date()
              : existing.publishedAt,
      },
    });
    await writeAuditLog(
      {
        action: auditAction(existing.status, status),
        entity: "News",
        entityId: id,
        userId: ctx.user.id,
        oldValue: { status: existing.status },
        newValue: { status },
        request: ctx.request,
      },
      tx,
    );
  });
  return { id };
}

export async function deleteNews(id: string, ctx: ActionContext) {
  const existing = await db.news.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ContentError("notFound");
  await db.$transaction(async (tx) => {
    await tx.news.update({
      where: { id },
      data: { deletedAt: new Date(), status: "DRAFT", slug: deletedSlug(existing.slug, id) },
    });
    await writeAuditLog(
      {
        action: "DELETE",
        entity: "News",
        entityId: id,
        userId: ctx.user.id,
        oldValue: { slug: existing.slug, status: existing.status },
        request: ctx.request,
      },
      tx,
    );
  });
  return { id };
}
