import "server-only";

import type { Locale } from "@/config/i18n";
import { isSystemPage } from "@/config/pages";
import { hasPermission } from "@/lib/auth/permissions";
import { deletedSlug } from "@/lib/content/slug";
import { db } from "@/lib/db/client";
import type { PageInput } from "@/lib/validation/page";
import { assertImages, pickedMediaSelect } from "@/server/services/media/media";
import { writeAuditLog } from "@/server/services/audit";
import { type ActionContext, ContentError } from "@/server/services/errors";

import { jsonOrNull, pickTranslation, presentLocales } from "./content/translations";

export async function listPages(locale: Locale) {
  const rows = await db.page.findMany({
    where: { deletedAt: null },
    orderBy: { slug: "asc" },
    select: {
      id: true,
      slug: true,
      status: true,
      updatedAt: true,
      translations: { select: { locale: true, title: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    status: r.status,
    updatedAt: r.updatedAt,
    system: isSystemPage(r.slug),
    title: pickTranslation(r.translations, locale)?.title ?? r.slug,
  }));
}

export function getPageForEdit(id: string) {
  return db.page.findFirst({
    where: { id, deletedAt: null },
    include: { translations: true, coverImage: { select: pickedMediaSelect } },
  });
}

function translationData(input: PageInput) {
  return presentLocales(input.translations).map((locale) => {
    const t = input.translations[locale]!;
    return {
      locale,
      title: t.title,
      content: jsonOrNull(t.content),
      seoTitle: t.seoTitle,
      seoDescription: t.seoDescription,
    };
  });
}

function assertPublishAllowed(ctx: ActionContext, from: string | null, to: string) {
  if ((from ?? "DRAFT") !== to && !hasPermission(ctx.user, "pages.publish"))
    throw new ContentError("validation", "status", "publishNotAllowed");
}

async function assertSlugFree(slug: string, exceptId?: string) {
  const clash = await db.page.findFirst({
    where: { slug, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  if (clash) throw new ContentError("conflict", "slug", "slugTaken");
}

const titles = (input: PageInput) =>
  Object.fromEntries(Object.entries(input.translations).map(([l, t]) => [l, t!.title]));

export async function createPage(input: PageInput, ctx: ActionContext) {
  assertPublishAllowed(ctx, null, input.status);
  await assertSlugFree(input.slug);
  if (input.coverImageId) await assertImages([input.coverImageId], "coverImageId");
  return db.$transaction(async (tx) => {
    const page = await tx.page.create({
      data: {
        slug: input.slug,
        coverImageId: input.coverImageId,
        status: input.status,
        publishedAt: input.status === "PUBLISHED" ? new Date() : null,
        translations: { create: translationData(input) },
      },
    });
    await writeAuditLog(
      {
        action: "CREATE",
        entity: "Page",
        entityId: page.id,
        userId: ctx.user.id,
        newValue: { slug: page.slug, status: page.status, titles: titles(input) },
        request: ctx.request,
      },
      tx,
    );
    return { id: page.id };
  });
}

export async function updatePage(id: string, input: PageInput, ctx: ActionContext) {
  const existing = await db.page.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ContentError("notFound");
  if (isSystemPage(existing.slug) && input.slug !== existing.slug)
    throw new ContentError("validation", "slug", "systemPage");
  assertPublishAllowed(ctx, existing.status, input.status);
  await assertSlugFree(input.slug, id);
  if (input.coverImageId) await assertImages([input.coverImageId], "coverImageId");
  const locales = presentLocales(input.translations);

  return db.$transaction(async (tx) => {
    await tx.page.update({
      where: { id },
      data: {
        slug: input.slug,
        coverImageId: input.coverImageId,
        status: input.status,
        publishedAt: input.status === "PUBLISHED" ? (existing.publishedAt ?? new Date()) : null,
      },
    });
    await tx.pageTranslation.deleteMany({ where: { pageId: id, locale: { notIn: locales } } });
    for (const t of translationData(input)) {
      await tx.pageTranslation.upsert({
        where: { pageId_locale: { pageId: id, locale: t.locale } },
        create: { ...t, pageId: id },
        update: t,
      });
    }
    const action =
      existing.status !== input.status
        ? input.status === "PUBLISHED"
          ? "PUBLISH"
          : "UNPUBLISH"
        : "UPDATE";
    await writeAuditLog(
      {
        action,
        entity: "Page",
        entityId: id,
        userId: ctx.user.id,
        oldValue: { slug: existing.slug, status: existing.status },
        newValue: { slug: input.slug, status: input.status, titles: titles(input) },
        request: ctx.request,
      },
      tx,
    );
    return { id };
  });
}

export async function setPagePublished(id: string, published: boolean, ctx: ActionContext) {
  const existing = await db.page.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ContentError("notFound");
  const status = published ? "PUBLISHED" : "DRAFT";
  if (existing.status === status) return { id };
  await db.$transaction(async (tx) => {
    await tx.page.update({
      where: { id },
      data: { status, publishedAt: published ? (existing.publishedAt ?? new Date()) : null },
    });
    await writeAuditLog(
      {
        action: published ? "PUBLISH" : "UNPUBLISH",
        entity: "Page",
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

export async function deletePage(id: string, ctx: ActionContext) {
  const existing = await db.page.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ContentError("notFound");
  if (isSystemPage(existing.slug)) throw new ContentError("validation", undefined, "systemPage");
  await db.$transaction(async (tx) => {
    await tx.page.update({
      where: { id },
      data: { deletedAt: new Date(), status: "DRAFT", slug: deletedSlug(existing.slug, id) },
    });
    await writeAuditLog(
      {
        action: "DELETE",
        entity: "Page",
        entityId: id,
        userId: ctx.user.id,
        oldValue: { slug: existing.slug },
        request: ctx.request,
      },
      tx,
    );
  });
  return { id };
}
