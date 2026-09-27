import "server-only";

import type { AuditAction, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db/client";
import { redactSecrets } from "@/lib/security/redact";
import type { RequestInfo } from "@/lib/security/request-info";

export type AuditEntry = {
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  userId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  request?: RequestInfo;
};

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return redactSecrets(value) as Prisma.InputJsonValue;
}

/**
 * Append an audit record. Snapshots are passed through redactSecrets().
 *
 * A failure is logged, not thrown: an audit-table outage must not lock every
 * administrator out. Pass a transaction client to make the audit record
 * commit or roll back together with the change it describes.
 */
export async function writeAuditLog(
  entry: AuditEntry,
  client: Pick<typeof db, "auditLog"> = db,
): Promise<void> {
  try {
    await client.auditLog.create({
      data: {
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        userId: entry.userId ?? null,
        oldValue: toJson(entry.oldValue),
        newValue: toJson(entry.newValue),
        ipAddress: entry.request?.ipAddress ?? null,
        userAgent: entry.request?.userAgent ?? null,
      },
    });
  } catch (error) {
    console.error(
      "[audit] failed to write audit log",
      { action: entry.action, entity: entry.entity },
      error,
    );
  }
}
