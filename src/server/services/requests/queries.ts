import "server-only";

import { z } from "zod";

import type { Locale } from "@/config/i18n";
import { InquiryStatus, type Prisma, QuoteStatus } from "@/generated/prisma/client";
import { pageParam, paginate, stringParam } from "@/lib/admin/list-params";
import { db } from "@/lib/db/client";

import { pickTranslation } from "../content/translations";

const assignedParam = z
  .union([z.literal("me"), z.literal("none"), z.uuid()])
  .optional()
  .catch(undefined);
const viewParam = z.enum(["active", "archived"]).catch("active");

export const inquiryListSchema = z.object({
  page: pageParam,
  q: stringParam(200),
  status: z.enum(InquiryStatus).optional().catch(undefined),
  assigned: assignedParam,
  view: viewParam,
});
export type InquiryListFilters = z.infer<typeof inquiryListSchema>;

export const quoteListSchema = inquiryListSchema.extend({
  status: z.enum(QuoteStatus).optional().catch(undefined),
});
export type QuoteListFilters = z.infer<typeof quoteListSchema>;

const assignedWhere = (assigned: InquiryListFilters["assigned"], userId: string) =>
  assigned === "me"
    ? { assignedToId: userId }
    : assigned === "none"
      ? { assignedToId: null }
      : assigned
        ? { assignedToId: assigned }
        : {};

const person = { select: { id: true, name: true } } as const;

export async function listInquiries(filters: InquiryListFilters, userId: string) {
  const where: Prisma.InquiryWhereInput = {
    archivedAt: filters.view === "archived" ? { not: null } : null,
    ...(filters.status ? { status: filters.status } : {}),
    ...assignedWhere(filters.assigned, userId),
    ...(filters.q
      ? {
          OR: ["name", "email", "company", "subject", "phone"].map((field) => ({
            [field]: { contains: filters.q, mode: "insensitive" },
          })),
        }
      : {}),
  };
  const total = await db.inquiry.count({ where });
  const { page, pageCount, skip, take } = paginate(total, filters.page);
  const rows = await db.inquiry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take,
    select: {
      id: true,
      name: true,
      email: true,
      company: true,
      subject: true,
      status: true,
      staffReadAt: true,
      createdAt: true,
      assignedTo: person,
      _count: { select: { attachments: true } },
    },
  });
  return { rows, total, page, pageCount };
}

export async function listQuotes(filters: QuoteListFilters, userId: string, locale: Locale) {
  const where: Prisma.QuoteRequestWhereInput = {
    archivedAt: filters.view === "archived" ? { not: null } : null,
    ...(filters.status ? { status: filters.status } : {}),
    ...assignedWhere(filters.assigned, userId),
    ...(filters.q
      ? {
          OR: [
            "referenceNumber",
            "customerName",
            "email",
            "company",
            "projectType",
            "location",
            "phone",
          ].map((field) => ({
            [field]: { contains: filters.q, mode: "insensitive" },
          })),
        }
      : {}),
  };
  const total = await db.quoteRequest.count({ where });
  const { page, pageCount, skip, take } = paginate(total, filters.page);
  const rows = await db.quoteRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take,
    select: {
      id: true,
      referenceNumber: true,
      customerName: true,
      company: true,
      projectType: true,
      location: true,
      estimatedBudget: true,
      currency: true,
      status: true,
      staffReadAt: true,
      createdAt: true,
      assignedTo: person,
      service: { select: { translations: { select: { locale: true, title: true } } } },
    },
  });
  return {
    total,
    page,
    pageCount,
    rows: rows.map(({ service, estimatedBudget, ...r }) => ({
      ...r,
      budget: estimatedBudget?.toString() ?? null,
      service: service ? (pickTranslation(service.translations, locale)?.title ?? null) : null,
    })),
  };
}

const detailExtras = {
  assignedTo: person,
  attachments: {
    orderBy: { createdAt: "asc" },
    select: { id: true, originalName: true, mimeType: true, size: true },
  },
  notes: {
    orderBy: { createdAt: "desc" },
    select: { id: true, body: true, createdAt: true, author: person },
  },
} as const;

export function getInquiry(id: string) {
  return db.inquiry.findUnique({ where: { id }, include: detailExtras });
}

export async function getQuote(id: string, locale: Locale) {
  const quote = await db.quoteRequest.findUnique({
    where: { id },
    include: {
      ...detailExtras,
      service: { select: { id: true, translations: { select: { locale: true, title: true } } } },
    },
  });
  if (!quote) return null;
  const { service, estimatedBudget, ...rest } = quote;
  return {
    ...rest,
    budget: estimatedBudget?.toString() ?? null,
    service: service
      ? { id: service.id, title: pickTranslation(service.translations, locale)?.title ?? "" }
      : null,
  };
}
