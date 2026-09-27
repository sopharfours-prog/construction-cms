import "server-only";

import { z } from "zod";

import { AuditAction, type Prisma } from "@/generated/prisma/client";
import { pageParam, paginate, stringParam } from "@/lib/admin/list-params";
import { db } from "@/lib/db/client";

export const auditFiltersSchema = z.object({
  page: pageParam,
  q: stringParam(254),
  action: z.enum(AuditAction).optional().catch(undefined),
  entity: stringParam(64),
  user: z.uuid().optional().catch(undefined),
});

export type AuditFilters = z.infer<typeof auditFiltersSchema>;

export async function listAuditLogs(filters: AuditFilters) {
  const where: Prisma.AuditLogWhereInput = {
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.entity ? { entity: filters.entity } : {}),
    ...(filters.user ? { userId: filters.user } : {}),
    ...(filters.q
      ? {
          OR: [
            { entityId: filters.q },
            { user: { email: { contains: filters.q, mode: "insensitive" } } },
            { newValue: { path: ["email"], string_contains: filters.q.toLowerCase() } },
          ],
        }
      : {}),
  };

  const total = await db.auditLog.count({ where });
  const { page, pageCount, skip, take } = paginate(total, filters.page);
  const rows = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take,
    include: { user: { select: { name: true, email: true } } },
  });

  return { rows, total, page, pageCount };
}

/** Options for the filter dropdowns. */
export async function getAuditFilterOptions() {
  const [entities, users] = await Promise.all([
    db.auditLog.groupBy({ by: ["entity"], orderBy: { entity: "asc" } }),
    db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { entities: entities.map((e) => e.entity), users };
}
