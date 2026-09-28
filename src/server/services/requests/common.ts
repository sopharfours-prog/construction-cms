import "server-only";

import type { InquiryStatus, QuoteStatus } from "@/generated/prisma/client";
import type { PermissionKey } from "@/lib/permissions/registry";
import { db } from "@/lib/db/client";
import { getStorage } from "@/lib/storage";
import { writeAuditLog } from "@/server/services/audit";
import { type ActionContext, ContentError } from "@/server/services/errors";
import { consumeRateLimit, rateLimitKey, rateLimits } from "@/server/services/rate-limit";

import { removeObjects } from "./attachments";
import { sendReply } from "./notify";

export type RequestKind = "inquiry" | "quote";

export const inquiryStatuses = [
  "NEW",
  "IN_PROGRESS",
  "REPLIED",
  "CLOSED",
] as const satisfies readonly InquiryStatus[];
export const quoteStatuses = [
  "NEW",
  "REVIEWING",
  "CONTACTED",
  "QUOTED",
  "APPROVED",
  "REJECTED",
  "CLOSED",
] as const satisfies readonly QuoteStatus[];

const config = {
  inquiry: {
    entity: "Inquiry",
    viewPermission: "inquiries.view",
    statuses: inquiryStatuses,
    repliedStatus: "REPLIED",
    earlyStatuses: ["NEW", "IN_PROGRESS"],
  },
  quote: {
    entity: "QuoteRequest",
    viewPermission: "quotes.view",
    statuses: quoteStatuses,
    repliedStatus: "CONTACTED",
    earlyStatuses: ["NEW", "REVIEWING"],
  },
} as const satisfies Record<
  RequestKind,
  {
    entity: string;
    viewPermission: PermissionKey;
    statuses: readonly string[];
    repliedStatus: string;
    earlyStatuses: readonly string[];
  }
>;

type Core = {
  id: string;
  status: string;
  email: string;
  assignedToId: string | null;
  archivedAt: Date | null;
};

// Thin, typed access to the two models so the operations below are written once.
const store = {
  inquiry: {
    find: (id: string) =>
      db.inquiry.findUnique({
        where: { id },
        select: { id: true, status: true, email: true, assignedToId: true, archivedAt: true },
      }),
    update: (
      id: string,
      data: {
        status?: InquiryStatus;
        assignedToId?: string | null;
        archivedAt?: Date | null;
        repliedAt?: Date;
      },
    ) => db.inquiry.update({ where: { id }, data }),
    addNote: (id: string, authorId: string, body: string) =>
      db.inquiryNote.create({ data: { inquiryId: id, authorId, body } }),
    attachmentKeys: async (id: string) =>
      (
        await db.inquiryAttachment.findMany({
          where: { inquiryId: id },
          select: { storageKey: true },
        })
      ).map((a) => a.storageKey),
    attachment: (id: string, attachmentId: string) =>
      db.inquiryAttachment.findFirst({ where: { id: attachmentId, inquiryId: id } }),
    delete: (id: string) => db.inquiry.delete({ where: { id } }),
  },
  quote: {
    find: (id: string) =>
      db.quoteRequest.findUnique({
        where: { id },
        select: { id: true, status: true, email: true, assignedToId: true, archivedAt: true },
      }),
    update: (
      id: string,
      data: { status?: QuoteStatus; assignedToId?: string | null; archivedAt?: Date | null },
    ) => db.quoteRequest.update({ where: { id }, data }),
    addNote: (id: string, authorId: string, body: string) =>
      db.quoteNote.create({ data: { quoteRequestId: id, authorId, body } }),
    attachmentKeys: async (id: string) =>
      (
        await db.quoteAttachment.findMany({
          where: { quoteRequestId: id },
          select: { storageKey: true },
        })
      ).map((a) => a.storageKey),
    attachment: (id: string, attachmentId: string) =>
      db.quoteAttachment.findFirst({ where: { id: attachmentId, quoteRequestId: id } }),
    delete: (id: string) => db.quoteRequest.delete({ where: { id } }),
  },
};

async function load(kind: RequestKind, id: string): Promise<Core> {
  const row = await store[kind].find(id);
  if (!row) throw new ContentError("notFound");
  return row;
}

async function audit(
  kind: RequestKind,
  id: string,
  ctx: ActionContext,
  action: "UPDATE" | "STATUS_CHANGE" | "DELETE",
  oldValue: object | undefined,
  newValue: object | undefined,
) {
  await writeAuditLog({
    action,
    entity: config[kind].entity,
    entityId: id,
    userId: ctx.user.id,
    oldValue,
    newValue,
    request: ctx.request,
  });
}

export async function setRequestStatus(
  kind: RequestKind,
  id: string,
  status: string,
  ctx: ActionContext,
) {
  if (!(config[kind].statuses as readonly string[]).includes(status))
    throw new ContentError("validation", "status", "invalid");
  const row = await load(kind, id);
  if (row.status === status) return { id };
  await (kind === "inquiry"
    ? store.inquiry.update(id, {
        status: status as InquiryStatus,
        ...(status === "REPLIED" ? { repliedAt: new Date() } : {}),
      })
    : store.quote.update(id, { status: status as QuoteStatus }));
  await audit(kind, id, ctx, "STATUS_CHANGE", { status: row.status }, { status });
  return { id };
}

/** Staff who can be assigned: active, not deleted, and allowed to view this kind of request. */
export async function listAssignableStaff(kind: RequestKind) {
  const users = await db.user.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      role: { permissions: { some: { permission: { key: config[kind].viewPermission } } } },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return users;
}

export async function assignRequest(
  kind: RequestKind,
  id: string,
  assigneeId: string | null,
  ctx: ActionContext,
) {
  const row = await load(kind, id);
  if (assigneeId && !(await listAssignableStaff(kind)).some((u) => u.id === assigneeId)) {
    throw new ContentError("validation", "assigneeId", "assigneeInvalid");
  }
  if (row.assignedToId === assigneeId) return { id };
  await store[kind].update(id, { assignedToId: assigneeId });
  await audit(
    kind,
    id,
    ctx,
    "UPDATE",
    { assignedToId: row.assignedToId },
    { assignedToId: assigneeId },
  );
  return { id };
}

export async function addRequestNote(
  kind: RequestKind,
  id: string,
  body: string,
  ctx: ActionContext,
) {
  await load(kind, id);
  const note = await store[kind].addNote(id, ctx.user.id, body);
  await audit(kind, id, ctx, "UPDATE", undefined, { noteId: note.id });
  return { id: note.id };
}

export async function setRequestArchived(
  kind: RequestKind,
  id: string,
  archived: boolean,
  ctx: ActionContext,
) {
  const row = await load(kind, id);
  if (Boolean(row.archivedAt) === archived) return { id };
  await store[kind].update(id, { archivedAt: archived ? new Date() : null });
  await audit(kind, id, ctx, "UPDATE", { archived: !archived }, { archived });
  return { id };
}

/**
 * Email the customer, keep a copy as an internal note, and move an early
 * request forward (inquiry → REPLIED, quote → CONTACTED).
 */
export async function replyToRequest(
  kind: RequestKind,
  id: string,
  input: { subject: string; body: string },
  ctx: ActionContext,
) {
  const row = await load(kind, id);
  const limit = await consumeRateLimit(rateLimitKey("reply", ctx.user.id), rateLimits.replyPerUser);
  if (!limit.allowed) throw new ContentError("validation", undefined, "rateLimited");
  try {
    await sendReply(row.email, input.subject, input.body);
  } catch (error) {
    console.error("[requests] reply failed", error);
    throw new ContentError("validation", undefined, "mailFailed");
  }
  await store[kind].addNote(id, ctx.user.id, `✉ ${input.subject}\n\n${input.body}`);
  const cfg = config[kind];
  if ((cfg.earlyStatuses as readonly string[]).includes(row.status)) {
    await setRequestStatus(kind, id, cfg.repliedStatus, ctx);
  }
  await audit(kind, id, ctx, "UPDATE", undefined, { emailSent: input.subject });
  return { id };
}

/** Hard delete (customer data): row, notes and stored files. Audited. */
export async function deleteRequest(kind: RequestKind, id: string, ctx: ActionContext) {
  const row = await load(kind, id);
  const keys = await store[kind].attachmentKeys(id);
  await store[kind].delete(id);
  await removeObjects(keys);
  await audit(
    kind,
    id,
    ctx,
    "DELETE",
    { email: row.email, status: row.status, attachments: keys.length },
    undefined,
  );
  return { id };
}

/** Private attachment for an authorized download (never a public URL). */
export async function openAttachment(kind: RequestKind, id: string, attachmentId: string) {
  const attachment = await store[kind].attachment(id, attachmentId);
  if (!attachment) return null;
  const object = await getStorage().get(attachment.storageKey);
  return object ? { attachment, object } : null;
}
