import "server-only";

import { z } from "zod";

import type { Locale } from "@/config/i18n";
import { type Prisma, ProjectStatus } from "@/generated/prisma/client";
import { pageParam, paginate, stringParam } from "@/lib/admin/list-params";
import { hasPermission } from "@/lib/auth/permissions";
import { deletedSlug } from "@/lib/content/slug";
import { db } from "@/lib/db/client";
import type { ProjectInput } from "@/lib/validation/project";
import { type ActionContext, ContentError } from "@/server/services/errors";
import { writeAuditLog } from "@/server/services/audit";

import { jsonOrNull, pickTranslation, presentLocales } from "./content/translations";

export const projectListSchema = z.object({
  page: pageParam,
  q: stringParam(200),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional().catch(undefined),
  projectStatus: z.enum(ProjectStatus).optional().catch(undefined),
  category: z.uuid().optional().catch(undefined),
  year: z.coerce.number().int().min(1950).max(2100).optional().catch(undefined),
  sort: z.enum(["updated", "created", "completion", "order"]).catch("updated"),
});
export type ProjectListFilters = z.infer<typeof projectListSchema>;

const orderBy: Record<ProjectListFilters["sort"], Prisma.ProjectOrderByWithRelationInput[]> = {
  updated: [{ updatedAt: "desc" }],
  created: [{ createdAt: "desc" }],
  completion: [{ completionDate: { sort: "desc", nulls: "last" } }, { startDate: "desc" }],
  order: [{ sortOrder: "asc" }, { createdAt: "desc" }],
};

export async function listProjects(filters: ProjectListFilters, locale: Locale) {
  const yearRange = filters.year
    ? {
        gte: new Date(Date.UTC(filters.year, 0, 1)),
        lt: new Date(Date.UTC(filters.year + 1, 0, 1)),
      }
    : null;
  const where: Prisma.ProjectWhereInput = {
    deletedAt: null,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.projectStatus ? { projectStatus: filters.projectStatus } : {}),
    ...(filters.category ? { categoryId: filters.category } : {}),
    ...(yearRange
      ? { OR: [{ completionDate: yearRange }, { completionDate: null, startDate: yearRange }] }
      : {}),
    ...(filters.q
      ? {
          AND: [
            {
              OR: [
                { slug: { contains: filters.q, mode: "insensitive" } },
                { translations: { some: { title: { contains: filters.q, mode: "insensitive" } } } },
                {
                  translations: {
                    some: { location: { contains: filters.q, mode: "insensitive" } },
                  },
                },
                {
                  translations: { some: { client: { contains: filters.q, mode: "insensitive" } } },
                },
              ],
            },
          ],
        }
      : {}),
  };

  const total = await db.project.count({ where });
  const { page, pageCount, skip, take } = paginate(total, filters.page);
  const rows = await db.project.findMany({
    where,
    orderBy: orderBy[filters.sort],
    skip,
    take,
    select: {
      id: true,
      slug: true,
      status: true,
      projectStatus: true,
      featured: true,
      startDate: true,
      completionDate: true,
      updatedAt: true,
      coverImage: { select: { url: true } },
      translations: { select: { locale: true, title: true, location: true } },
      category: { select: { translations: { select: { locale: true, name: true } } } },
    },
  });

  return {
    total,
    page,
    pageCount,
    rows: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      status: r.status,
      projectStatus: r.projectStatus,
      featured: r.featured,
      year: (r.completionDate ?? r.startDate)?.getUTCFullYear() ?? null,
      updatedAt: r.updatedAt,
      coverUrl: r.coverImage?.url ?? null,
      title: pickTranslation(r.translations, locale)?.title ?? r.slug,
      location: pickTranslation(r.translations, locale)?.location ?? null,
      category: r.category
        ? (pickTranslation(r.category.translations, locale)?.name ?? null)
        : null,
      missingLocales: r.translations.length,
    })),
  };
}

export async function getProjectFormOptions(locale: Locale) {
  const [categories, services, years] = await Promise.all([
    db.category.findMany({
      where: { type: "PROJECT" },
      orderBy: { sortOrder: "asc" },
      select: { id: true, translations: { select: { locale: true, name: true } } },
    }),
    db.service.findMany({
      where: { deletedAt: null },
      orderBy: { sortOrder: "asc" },
      select: { id: true, translations: { select: { locale: true, title: true } } },
    }),
    db.$queryRaw<{ year: number }[]>`
      SELECT DISTINCT EXTRACT(YEAR FROM COALESCE(completion_date, start_date))::int AS year
      FROM projects WHERE deleted_at IS NULL AND COALESCE(completion_date, start_date) IS NOT NULL
      ORDER BY year DESC`,
  ]);
  return {
    categories: categories.map((c) => ({
      id: c.id,
      name: pickTranslation(c.translations, locale)?.name ?? "",
    })),
    services: services.map((s) => ({
      id: s.id,
      name: pickTranslation(s.translations, locale)?.title ?? "",
    })),
    years: years.map((y) => Number(y.year)),
  };
}

export async function getProjectForEdit(id: string) {
  return db.project.findFirst({
    where: { id, deletedAt: null },
    include: { translations: true, services: { select: { serviceId: true } } },
  });
}

/** Compact snapshot for the audit log (no rich text bodies). */
function snapshot(
  p: { slug: string; status: string; projectStatus: string; featured: boolean },
  titles: Record<string, string>,
) {
  return {
    slug: p.slug,
    status: p.status,
    projectStatus: p.projectStatus,
    featured: p.featured,
    titles,
  };
}

function titlesOf(input: ProjectInput) {
  return Object.fromEntries(Object.entries(input.translations).map(([l, t]) => [l, t!.title]));
}

function assertPublishAllowed(ctx: ActionContext, from: string | null, to: string) {
  const changes = (from ?? "DRAFT") !== to && (to === "PUBLISHED" || from === "PUBLISHED");
  if (changes && !hasPermission(ctx.user, "projects.publish")) {
    throw new ContentError("validation", "status", "publishNotAllowed");
  }
}

async function assertSlugFree(slug: string, exceptId?: string) {
  const clash = await db.project.findFirst({
    where: { slug, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  if (clash) throw new ContentError("conflict", "slug", "slugTaken");
}

function translationData(input: ProjectInput) {
  return presentLocales(input.translations).map((locale) => {
    const t = input.translations[locale]!;
    return {
      locale,
      title: t.title,
      shortDescription: t.shortDescription,
      description: jsonOrNull(t.description),
      location: t.location,
      client: t.client,
      architect: t.architect,
      contractor: t.contractor,
      projectManager: t.projectManager,
      specifications: jsonOrNull(t.specifications),
      seoTitle: t.seoTitle,
      seoDescription: t.seoDescription,
    };
  });
}

export async function createProject(input: ProjectInput, ctx: ActionContext) {
  assertPublishAllowed(ctx, null, input.status);
  await assertSlugFree(input.slug);

  return db.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        slug: input.slug,
        categoryId: input.categoryId,
        projectStatus: input.projectStatus,
        status: input.status,
        featured: input.featured,
        startDate: input.startDate,
        completionDate: input.completionDate,
        budget: input.budget,
        currency: input.currency,
        showBudget: input.showBudget,
        publishedAt: input.status === "PUBLISHED" ? new Date() : null,
        createdById: ctx.user.id,
        updatedById: ctx.user.id,
        translations: { create: translationData(input) },
        services: { create: input.serviceIds.map((serviceId) => ({ serviceId })) },
      },
    });
    await writeAuditLog(
      {
        action: "CREATE",
        entity: "Project",
        entityId: project.id,
        userId: ctx.user.id,
        newValue: snapshot(project, titlesOf(input)),
        request: ctx.request,
      },
      tx,
    );
    return { id: project.id };
  });
}

export async function updateProject(id: string, input: ProjectInput, ctx: ActionContext) {
  const existing = await db.project.findFirst({
    where: { id, deletedAt: null },
    include: { translations: { select: { locale: true, title: true } } },
  });
  if (!existing) throw new ContentError("notFound");
  assertPublishAllowed(ctx, existing.status, input.status);
  await assertSlugFree(input.slug, id);

  const locales = presentLocales(input.translations);
  return db.$transaction(async (tx) => {
    const project = await tx.project.update({
      where: { id },
      data: {
        slug: input.slug,
        categoryId: input.categoryId,
        projectStatus: input.projectStatus,
        status: input.status,
        featured: input.featured,
        startDate: input.startDate,
        completionDate: input.completionDate,
        budget: input.budget,
        currency: input.currency,
        showBudget: input.showBudget,
        publishedAt: input.status === "PUBLISHED" ? (existing.publishedAt ?? new Date()) : null,
        updatedById: ctx.user.id,
      },
    });
    await tx.projectTranslation.deleteMany({
      where: { projectId: id, locale: { notIn: locales } },
    });
    for (const t of translationData(input)) {
      await tx.projectTranslation.upsert({
        where: { projectId_locale: { projectId: id, locale: t.locale } },
        create: { ...t, projectId: id },
        update: t,
      });
    }
    await tx.projectService.deleteMany({ where: { projectId: id } });
    if (input.serviceIds.length) {
      await tx.projectService.createMany({
        data: input.serviceIds.map((serviceId) => ({ projectId: id, serviceId })),
        skipDuplicates: true,
      });
    }
    const oldTitles = Object.fromEntries(existing.translations.map((t) => [t.locale, t.title]));
    const action =
      existing.status !== project.status
        ? project.status === "PUBLISHED"
          ? "PUBLISH"
          : "UNPUBLISH"
        : "UPDATE";
    await writeAuditLog(
      {
        action,
        entity: "Project",
        entityId: id,
        userId: ctx.user.id,
        oldValue: snapshot(existing, oldTitles),
        newValue: snapshot(project, titlesOf(input)),
        request: ctx.request,
      },
      tx,
    );
    return { id };
  });
}

export async function setProjectPublished(id: string, published: boolean, ctx: ActionContext) {
  const existing = await db.project.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ContentError("notFound");
  const status = published ? "PUBLISHED" : "DRAFT";
  if (existing.status === status) return { id };
  await db.$transaction(async (tx) => {
    await tx.project.update({
      where: { id },
      data: {
        status,
        publishedAt: published ? (existing.publishedAt ?? new Date()) : null,
        updatedById: ctx.user.id,
      },
    });
    await writeAuditLog(
      {
        action: published ? "PUBLISH" : "UNPUBLISH",
        entity: "Project",
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

/** Soft delete: the row stays for the audit trail, its slug is freed. */
export async function deleteProject(id: string, ctx: ActionContext) {
  const existing = await db.project.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ContentError("notFound");
  await db.$transaction(async (tx) => {
    await tx.project.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "DRAFT",
        featured: false,
        slug: deletedSlug(existing.slug, id),
        updatedById: ctx.user.id,
      },
    });
    await writeAuditLog(
      {
        action: "DELETE",
        entity: "Project",
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
