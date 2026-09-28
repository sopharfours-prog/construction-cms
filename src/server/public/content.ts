import "server-only";

import { cache } from "react";
import { z } from "zod";

import type { Locale } from "@/config/i18n";
import { ProjectStatus, type Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db/client";
import type { RichTextDoc } from "@/lib/content/rich-text";
import { richTextToPlain } from "@/lib/content/rich-text";
import { pickTranslation } from "@/server/services/content/translations";
import { getSetting } from "@/server/services/settings";

// Only published, not deleted. News also needs its publication time to have passed
// (scheduled articles appear automatically; cached pages refresh within minutes).
const liveProject = { deletedAt: null, status: "PUBLISHED" } satisfies Prisma.ProjectWhereInput;
const liveService = { deletedAt: null, status: "PUBLISHED" } satisfies Prisma.ServiceWhereInput;
const liveNews = (): Prisma.NewsWhereInput => ({
  deletedAt: null,
  status: { in: ["PUBLISHED", "SCHEDULED"] },
  publishedAt: { lte: new Date() },
});

const image = {
  select: { url: true, altText: true, width: true, height: true, blurDataUrl: true },
} as const;
export type PublicImage = {
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
};

type T<K extends string> = { locale: string } & Record<K, unknown>;
const tr = <X extends T<string>>(list: X[], locale: Locale) => pickTranslation(list, locale);
const categoryName = (
  c: { translations: { locale: string; name: string }[] } | null,
  locale: Locale,
) => (c ? (tr(c.translations, locale)?.name ?? null) : null);

// ─── Projects ────────────────────────────────────────────────────────────────

const projectCardSelect = {
  slug: true,
  projectStatus: true,
  startDate: true,
  completionDate: true,
  coverImage: image,
  category: { select: { slug: true, translations: { select: { locale: true, name: true } } } },
  translations: { select: { locale: true, title: true, location: true, shortDescription: true } },
} satisfies Prisma.ProjectSelect;

function toProjectCard(
  p: Prisma.ProjectGetPayload<{ select: typeof projectCardSelect }>,
  locale: Locale,
) {
  const t = tr(p.translations, locale);
  return {
    slug: p.slug,
    title: t?.title ?? p.slug,
    location: t?.location ?? null,
    summary: t?.shortDescription ?? null,
    status: p.projectStatus,
    year: (p.completionDate ?? p.startDate)?.getUTCFullYear() ?? null,
    category: categoryName(p.category, locale),
    cover: p.coverImage as PublicImage | null,
  };
}
export type ProjectCard = ReturnType<typeof toProjectCard>;

export const PROJECTS_PER_PAGE = 12;
export const publicProjectFilters = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  category: z
    .string()
    .max(100)
    .regex(/^[a-z0-9-]+$/)
    .optional()
    .catch(undefined),
  status: z.enum(ProjectStatus).optional().catch(undefined),
  year: z.coerce.number().int().min(1950).max(2100).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});
export type PublicProjectFilters = z.infer<typeof publicProjectFilters>;

export async function listPublicProjects(filters: PublicProjectFilters, locale: Locale) {
  const range = filters.year
    ? {
        gte: new Date(Date.UTC(filters.year, 0, 1)),
        lt: new Date(Date.UTC(filters.year + 1, 0, 1)),
      }
    : null;
  const where: Prisma.ProjectWhereInput = {
    ...liveProject,
    ...(filters.status ? { projectStatus: filters.status } : {}),
    ...(filters.category ? { category: { slug: filters.category } } : {}),
    AND: [
      range ? { OR: [{ completionDate: range }, { completionDate: null, startDate: range }] } : {},
      filters.q
        ? {
            translations: {
              some: {
                OR: (["title", "location", "client"] as const).map((f) => ({
                  [f]: { contains: filters.q, mode: "insensitive" as const },
                })),
              },
            },
          }
        : {},
    ],
  };
  const total = await db.project.count({ where });
  const pages = Math.max(1, Math.ceil(total / PROJECTS_PER_PAGE));
  const page = Math.min(filters.page, pages);
  const rows = await db.project.findMany({
    where,
    orderBy: [
      { featured: "desc" },
      { sortOrder: "asc" },
      { completionDate: { sort: "desc", nulls: "first" } },
    ],
    skip: (page - 1) * PROJECTS_PER_PAGE,
    take: PROJECTS_PER_PAGE,
    select: projectCardSelect,
  });
  return { items: rows.map((r) => toProjectCard(r, locale)), total, page, pages };
}

export const getProjectFilterOptions = cache(async (locale: Locale) => {
  const [categories, years] = await Promise.all([
    db.category.findMany({
      where: { type: "PROJECT", projects: { some: liveProject } },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, translations: { select: { locale: true, name: true } } },
    }),
    db.$queryRaw<{ year: number }[]>`
      SELECT DISTINCT EXTRACT(YEAR FROM COALESCE(completion_date, start_date))::int AS year FROM projects
      WHERE deleted_at IS NULL AND status = 'PUBLISHED' AND COALESCE(completion_date, start_date) IS NOT NULL
      ORDER BY year DESC`,
  ]);
  return {
    categories: categories.map((c) => ({ slug: c.slug, name: categoryName(c, locale) ?? c.slug })),
    years: years.map((y) => Number(y.year)),
  };
});

export const getPublicProject = cache(async (slug: string, locale: Locale) => {
  const p = await db.project.findFirst({
    where: { ...liveProject, slug },
    include: {
      translations: true,
      coverImage: image,
      category: {
        select: { id: true, slug: true, translations: { select: { locale: true, name: true } } },
      },
      images: {
        orderBy: { sortOrder: "asc" },
        select: {
          media: image,
          translations: { select: { locale: true, altText: true, caption: true } },
        },
      },
      services: {
        where: { service: liveService },
        select: {
          service: {
            select: {
              slug: true,
              icon: true,
              translations: { select: { locale: true, title: true } },
            },
          },
        },
      },
    },
  });
  if (!p) return null;
  const t = tr(p.translations, locale)!;
  const related = await db.project.findMany({
    where: {
      ...liveProject,
      id: { not: p.id },
      ...(p.categoryId ? { categoryId: p.categoryId } : {}),
    },
    orderBy: [{ featured: "desc" }, { completionDate: { sort: "desc", nulls: "first" } }],
    take: 3,
    select: projectCardSelect,
  });
  return {
    slug: p.slug,
    title: t.title,
    summary: t.shortDescription,
    description: t.description as RichTextDoc | null,
    seo: { title: t.seoTitle, description: t.seoDescription },
    location: t.location,
    client: t.client,
    architect: t.architect,
    contractor: t.contractor,
    projectManager: t.projectManager,
    specifications: Array.isArray(t.specifications)
      ? (t.specifications as { label: string; value: string }[])
      : [],
    status: p.projectStatus,
    startDate: p.startDate,
    completionDate: p.completionDate,
    budget: p.showBudget && p.budget ? { amount: p.budget.toString(), currency: p.currency } : null,
    category: p.category ? { slug: p.category.slug, name: categoryName(p.category, locale) } : null,
    cover: p.coverImage as PublicImage | null,
    gallery: p.images.map((i) => {
      const text = tr(i.translations, locale);
      return {
        ...(i.media as PublicImage),
        altText: text?.altText || i.media.altText,
        caption: text?.caption ?? null,
      };
    }),
    services: p.services.map(({ service }) => ({
      slug: service.slug,
      icon: service.icon,
      title: tr(service.translations, locale)?.title ?? service.slug,
    })),
    related: related.map((r) => toProjectCard(r, locale)),
    updatedAt: p.updatedAt,
  };
});

// ─── Services ────────────────────────────────────────────────────────────────

export const listPublicServices = cache(async (locale: Locale) => {
  const rows = await db.service.findMany({
    where: liveService,
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      icon: true,
      coverImage: image,
      translations: { select: { locale: true, title: true, description: true } },
    },
  });
  return rows.map((s) => {
    const t = tr(s.translations, locale);
    return {
      id: s.id,
      slug: s.slug,
      icon: s.icon,
      title: t?.title ?? s.slug,
      description: t?.description ?? null,
      cover: s.coverImage as PublicImage | null,
    };
  });
});
export type ServiceCard = Awaited<ReturnType<typeof listPublicServices>>[number];

export const getPublicService = cache(async (slug: string, locale: Locale) => {
  const s = await db.service.findFirst({
    where: { ...liveService, slug },
    include: { translations: true, coverImage: image },
  });
  if (!s) return null;
  const t = tr(s.translations, locale)!;
  const projects = await db.project.findMany({
    where: { ...liveProject, services: { some: { serviceId: s.id } } },
    orderBy: [{ featured: "desc" }, { completionDate: { sort: "desc", nulls: "first" } }],
    take: 6,
    select: projectCardSelect,
  });
  return {
    slug: s.slug,
    icon: s.icon,
    title: t.title,
    description: t.description,
    content: t.content as RichTextDoc | null,
    process: Array.isArray(t.process)
      ? (t.process as { title: string; description: string }[])
      : [],
    seo: { title: t.seoTitle, description: t.seoDescription },
    cover: s.coverImage as PublicImage | null,
    projects: projects.map((p) => toProjectCard(p, locale)),
    updatedAt: s.updatedAt,
  };
});

// ─── News ────────────────────────────────────────────────────────────────────

const newsCardSelect = {
  slug: true,
  publishedAt: true,
  coverImage: image,
  category: { select: { slug: true, translations: { select: { locale: true, name: true } } } },
  translations: { select: { locale: true, title: true, excerpt: true } },
} satisfies Prisma.NewsSelect;

function toNewsCard(n: Prisma.NewsGetPayload<{ select: typeof newsCardSelect }>, locale: Locale) {
  const t = tr(n.translations, locale);
  return {
    slug: n.slug,
    title: t?.title ?? n.slug,
    excerpt: t?.excerpt ?? null,
    publishedAt: n.publishedAt!,
    category: categoryName(n.category, locale),
    cover: n.coverImage as PublicImage | null,
  };
}
export type NewsCard = ReturnType<typeof toNewsCard>;

export const NEWS_PER_PAGE = 9;
export const publicNewsFilters = z.object({
  category: z
    .string()
    .max(100)
    .regex(/^[a-z0-9-]+$/)
    .optional()
    .catch(undefined),
  tag: z
    .string()
    .max(100)
    .regex(/^[a-z0-9-]+$/)
    .optional()
    .catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});
export type PublicNewsFilters = z.infer<typeof publicNewsFilters>;

export async function listPublicNews(filters: PublicNewsFilters, locale: Locale) {
  const where: Prisma.NewsWhereInput = {
    ...liveNews(),
    ...(filters.category ? { category: { slug: filters.category } } : {}),
    ...(filters.tag ? { tags: { some: { tag: { slug: filters.tag } } } } : {}),
  };
  const total = await db.news.count({ where });
  const pages = Math.max(1, Math.ceil(total / NEWS_PER_PAGE));
  const page = Math.min(filters.page, pages);
  const rows = await db.news.findMany({
    where,
    orderBy: { publishedAt: "desc" },
    skip: (page - 1) * NEWS_PER_PAGE,
    take: NEWS_PER_PAGE,
    select: newsCardSelect,
  });
  const [categories, tag] = await Promise.all([
    db.category.findMany({
      where: { type: "NEWS", news: { some: liveNews() } },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, translations: { select: { locale: true, name: true } } },
    }),
    filters.tag
      ? db.tag.findUnique({
          where: { slug: filters.tag },
          select: { translations: { select: { locale: true, name: true } } },
        })
      : null,
  ]);
  return {
    items: rows.map((r) => toNewsCard(r, locale)),
    total,
    page,
    pages,
    categories: categories.map((c) => ({ slug: c.slug, name: categoryName(c, locale) ?? c.slug })),
    tagName: tag ? (tr(tag.translations, locale)?.name ?? filters.tag) : null,
  };
}

export const getPublicNews = cache(async (slug: string, locale: Locale) => {
  const n = await db.news.findFirst({
    where: { ...liveNews(), slug },
    include: {
      translations: true,
      coverImage: image,
      seoImage: image,
      author: { select: { name: true } },
      category: { select: { slug: true, translations: { select: { locale: true, name: true } } } },
      tags: {
        select: {
          tag: { select: { slug: true, translations: { select: { locale: true, name: true } } } },
        },
      },
    },
  });
  if (!n) return null;
  const t = tr(n.translations, locale)!;
  const more = await db.news.findMany({
    where: { ...liveNews(), id: { not: n.id } },
    orderBy: { publishedAt: "desc" },
    take: 3,
    select: newsCardSelect,
  });
  return {
    slug: n.slug,
    title: t.title,
    excerpt: t.excerpt,
    content: t.content as RichTextDoc | null,
    seo: {
      title: t.seoTitle,
      description: t.seoDescription,
      image: (n.seoImage ?? n.coverImage) as PublicImage | null,
    },
    publishedAt: n.publishedAt!,
    updatedAt: n.updatedAt,
    author: n.author?.name ?? null,
    category: n.category ? { slug: n.category.slug, name: categoryName(n.category, locale) } : null,
    tags: n.tags.map(({ tag }) => ({
      slug: tag.slug,
      name: tr(tag.translations, locale)?.name ?? tag.slug,
    })),
    cover: n.coverImage as PublicImage | null,
    more: more.map((m) => toNewsCard(m, locale)),
  };
});

// ─── Pages, About, Home ─────────────────────────────────────────────────────

export const getPublicPage = cache(async (slug: string, locale: Locale) => {
  const p = await db.page.findFirst({
    where: { slug, deletedAt: null, status: "PUBLISHED" },
    include: { translations: true, coverImage: image },
  });
  if (!p) return null;
  const t = tr(p.translations, locale)!;
  return {
    slug: p.slug,
    title: t.title,
    content: t.content as RichTextDoc | null,
    seo: { title: t.seoTitle, description: t.seoDescription },
    cover: p.coverImage as PublicImage | null,
    updatedAt: p.updatedAt,
  };
});

export const getAboutData = cache(async (locale: Locale) => {
  const [page, team, certifications, milestones] = await Promise.all([
    getPublicPage("about", locale),
    db.teamMember.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { sortOrder: "asc" },
      select: { id: true, photo: image, translations: true },
    }),
    db.certification.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { sortOrder: "asc" },
      select: { id: true, issuedAt: true, expiresAt: true, image, translations: true },
    }),
    db.milestone.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ year: "asc" }, { sortOrder: "asc" }],
      select: { id: true, year: true, translations: true },
    }),
  ]);
  return {
    page,
    team: team.map((m) => {
      const t = tr(m.translations, locale);
      return {
        id: m.id,
        name: t?.name ?? "",
        position: t?.position ?? "",
        bio: t?.bio ?? null,
        photo: m.photo as PublicImage | null,
      };
    }),
    certifications: certifications.map((c) => {
      const t = tr(c.translations, locale);
      return {
        id: c.id,
        name: t?.name ?? "",
        issuer: t?.issuer ?? null,
        description: t?.description ?? null,
        issuedAt: c.issuedAt,
        expiresAt: c.expiresAt,
        image: c.image as PublicImage | null,
      };
    }),
    milestones: milestones.map((m) => {
      const t = tr(m.translations, locale);
      return { id: m.id, year: m.year, title: t?.title ?? "", description: t?.description ?? null };
    }),
  };
});

export const getHomeData = cache(async (locale: Locale) => {
  const [featured, services, news, projectCount, statistics, about] = await Promise.all([
    db.project.findMany({
      where: { ...liveProject, featured: true },
      orderBy: [{ sortOrder: "asc" }, { completionDate: { sort: "desc", nulls: "first" } }],
      take: 6,
      select: projectCardSelect,
    }),
    listPublicServices(locale),
    db.news.findMany({
      where: liveNews(),
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: newsCardSelect,
    }),
    db.project.count({ where: { ...liveProject, projectStatus: "COMPLETED" } }),
    getSetting("statistics"),
    getPublicPage("about", locale),
  ]);
  const aboutText = richTextToPlain(about?.content);
  return {
    featured: featured.map((p) => toProjectCard(p, locale)),
    services,
    news: news.map((n) => toNewsCard(n, locale)),
    stats: {
      projects: projectCount,
      years: statistics?.yearsOfExperience ?? null,
      clients: statistics?.clients ?? null,
      team: statistics?.teamMembers ?? null,
    },
    about: about
      ? {
          title: about.title,
          excerpt:
            aboutText.length > 420
              ? `${aboutText.slice(0, 420).replace(/\s+\S*$/, "")}…`
              : aboutText,
        }
      : null,
  };
});
