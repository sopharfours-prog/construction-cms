import "server-only";

import type { Locale } from "@/config/i18n";
import { hasPermission } from "@/lib/auth/permissions";
import { deletedSlug } from "@/lib/content/slug";
import { db } from "@/lib/db/client";
import type { ServiceInput } from "@/lib/validation/service";
import { writeAuditLog } from "@/server/services/audit";
import { type ActionContext, ContentError } from "@/server/services/errors";

import { jsonOrNull, pickTranslation, presentLocales } from "./content/translations";

/** Services are few and manually ordered: no pagination. */
export async function listServices(locale: Locale) {
  const rows = await db.service.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      slug: true,
      icon: true,
      status: true,
      updatedAt: true,
      translations: { select: { locale: true, title: true, description: true } },
      _count: { select: { projects: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    icon: r.icon,
    status: r.status,
    updatedAt: r.updatedAt,
    title: pickTranslation(r.translations, locale)?.title ?? r.slug,
    description: pickTranslation(r.translations, locale)?.description ?? null,
    projectCount: r._count.projects,
  }));
}

export function getServiceForEdit(id: string) {
  return db.service.findFirst({ where: { id, deletedAt: null }, include: { translations: true } });
}

function translationData(input: ServiceInput) {
  return presentLocales(input.translations).map((locale) => {
    const t = input.translations[locale]!;
    return {
      locale,
      title: t.title,
      description: t.description,
      content: jsonOrNull(t.content),
      process: jsonOrNull(t.process),
      seoTitle: t.seoTitle,
      seoDescription: t.seoDescription,
    };
  });
}

function assertPublishAllowed(ctx: ActionContext, from: string | null, to: string) {
  if ((from ?? "DRAFT") !== to && !hasPermission(ctx.user, "services.publish")) {
    throw new ContentError("validation", "status", "publishNotAllowed");
  }
}

async function assertSlugFree(slug: string, exceptId?: string) {
  const clash = await db.service.findFirst({
    where: { slug, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  if (clash) throw new ContentError("conflict", "slug", "slugTaken");
}

const titles = (input: ServiceInput) =>
  Object.fromEntries(Object.entries(input.translations).map(([l, t]) => [l, t!.title]));

export async function createService(input: ServiceInput, ctx: ActionContext) {
  assertPublishAllowed(ctx, null, input.status);
  await assertSlugFree(input.slug);
  return db.$transaction(async (tx) => {
    const last = await tx.service.aggregate({
      where: { deletedAt: null },
      _max: { sortOrder: true },
    });
    const service = await tx.service.create({
      data: {
        slug: input.slug,
        icon: input.icon,
        status: input.status,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
        publishedAt: input.status === "PUBLISHED" ? new Date() : null,
        translations: { create: translationData(input) },
      },
    });
    await writeAuditLog(
      {
        action: "CREATE",
        entity: "Service",
        entityId: service.id,
        userId: ctx.user.id,
        newValue: { slug: input.slug, status: input.status, titles: titles(input) },
        request: ctx.request,
      },
      tx,
    );
    return { id: service.id };
  });
}

export async function updateService(id: string, input: ServiceInput, ctx: ActionContext) {
  const existing = await db.service.findFirst({
    where: { id, deletedAt: null },
    include: { translations: { select: { locale: true, title: true } } },
  });
  if (!existing) throw new ContentError("notFound");
  assertPublishAllowed(ctx, existing.status, input.status);
  await assertSlugFree(input.slug, id);
  const locales = presentLocales(input.translations);

  return db.$transaction(async (tx) => {
    await tx.service.update({
      where: { id },
      data: {
        slug: input.slug,
        icon: input.icon,
        status: input.status,
        publishedAt: input.status === "PUBLISHED" ? (existing.publishedAt ?? new Date()) : null,
      },
    });
    await tx.serviceTranslation.deleteMany({
      where: { serviceId: id, locale: { notIn: locales } },
    });
    for (const t of translationData(input)) {
      await tx.serviceTranslation.upsert({
        where: { serviceId_locale: { serviceId: id, locale: t.locale } },
        create: { ...t, serviceId: id },
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
        entity: "Service",
        entityId: id,
        userId: ctx.user.id,
        oldValue: {
          slug: existing.slug,
          status: existing.status,
          titles: Object.fromEntries(existing.translations.map((t) => [t.locale, t.title])),
        },
        newValue: { slug: input.slug, status: input.status, titles: titles(input) },
        request: ctx.request,
      },
      tx,
    );
    return { id };
  });
}

export async function setServicePublished(id: string, published: boolean, ctx: ActionContext) {
  const existing = await db.service.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ContentError("notFound");
  const status = published ? "PUBLISHED" : "DRAFT";
  if (existing.status === status) return { id };
  await db.$transaction(async (tx) => {
    await tx.service.update({
      where: { id },
      data: { status, publishedAt: published ? (existing.publishedAt ?? new Date()) : null },
    });
    await writeAuditLog(
      {
        action: published ? "PUBLISH" : "UNPUBLISH",
        entity: "Service",
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

/** Swap with the neighbour above or below. */
export async function moveService(id: string, direction: "up" | "down", ctx: ActionContext) {
  return db.$transaction(async (tx) => {
    const all = await tx.service.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    const index = all.findIndex((s) => s.id === id);
    if (index < 0) throw new ContentError("notFound");
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= all.length) return { id };
    const order = all.map((s) => s.id);
    [order[index], order[target]] = [order[target]!, order[index]!];
    // Renumber densely so the order stays stable even if values had gaps or ties.
    for (const [position, serviceId] of order.entries()) {
      await tx.service.update({ where: { id: serviceId }, data: { sortOrder: position } });
    }
    await writeAuditLog(
      {
        action: "UPDATE",
        entity: "Service",
        entityId: id,
        userId: ctx.user.id,
        newValue: { reordered: direction },
        request: ctx.request,
      },
      tx,
    );
    return { id };
  });
}

export async function deleteService(id: string, ctx: ActionContext) {
  const existing = await db.service.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ContentError("notFound");
  await db.$transaction(async (tx) => {
    await tx.service.update({
      where: { id },
      data: { deletedAt: new Date(), status: "DRAFT", slug: deletedSlug(existing.slug, id) },
    });
    await tx.projectService.deleteMany({ where: { serviceId: id } });
    await writeAuditLog(
      {
        action: "DELETE",
        entity: "Service",
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
