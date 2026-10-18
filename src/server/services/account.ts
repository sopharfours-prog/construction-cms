import "server-only";

import { db } from "@/lib/db/client";
import { checkUpload } from "@/lib/files/sniff";
import type { ProfileInput } from "@/lib/validation/users";
import { writeAuditLog } from "@/server/services/audit";
import { type ActionContext, ContentError } from "@/server/services/errors";
import { uploadMedia } from "@/server/services/media/media";

/**
 * A signed-in person's own profile. Every function acts on ctx.user only (the
 * id comes from the session, never from the request), and needs no permission.
 * Email, role and status stay with administrators (see services/users).
 */

export function getProfile(userId: string) {
  return db.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      name: true,
      email: true,
      preferredLocale: true,
      createdAt: true,
      lastLoginAt: true,
      role: { select: { name: true, key: true } },
      avatar: { select: { id: true, url: true } },
    },
  });
}

async function audit(ctx: ActionContext, oldValue: object, newValue: object) {
  await writeAuditLog({
    action: "UPDATE",
    entity: "User",
    entityId: ctx.user.id,
    userId: ctx.user.id,
    oldValue,
    newValue: { ...newValue, by: "self" },
    request: ctx.request,
  });
}

export async function updateOwnProfile(input: ProfileInput, ctx: ActionContext) {
  const before = await db.user.findFirst({
    where: { id: ctx.user.id, deletedAt: null },
    select: { name: true, preferredLocale: true },
  });
  if (!before) throw new ContentError("notFound");
  if (before.name === input.name && before.preferredLocale === input.preferredLocale)
    return { id: ctx.user.id };
  await db.user.update({
    where: { id: ctx.user.id },
    data: { name: input.name, preferredLocale: input.preferredLocale },
  });
  await audit(ctx, before, { name: input.name, preferredLocale: input.preferredLocale });
  return { id: ctx.user.id };
}

/**
 * New profile photo. Images only (5 MB), re-encoded without metadata like any
 * upload; it is kept in the media library (uploaded by its owner).
 */
export async function setOwnAvatar(file: { name: string; buffer: Buffer }, ctx: ActionContext) {
  const check = checkUpload(file.buffer, "avatar");
  if (!check.ok) throw new ContentError("validation", "file", check.reason);
  const media = await uploadMedia(file, { altText: ctx.user.name }, ctx);
  const before = await db.user.findUniqueOrThrow({
    where: { id: ctx.user.id },
    select: { avatarId: true },
  });
  await db.user.update({ where: { id: ctx.user.id }, data: { avatarId: media.id } });
  await audit(ctx, before, { avatarId: media.id });
  return { avatarUrl: media.url };
}

/** Back to initials. The old photo stays in the media library. */
export async function removeOwnAvatar(ctx: ActionContext) {
  const before = await db.user.findUniqueOrThrow({
    where: { id: ctx.user.id },
    select: { avatarId: true },
  });
  if (!before.avatarId) return { avatarUrl: null };
  await db.user.update({ where: { id: ctx.user.id }, data: { avatarId: null } });
  await audit(ctx, before, { avatarId: null });
  return { avatarUrl: null };
}

/** The person's own latest actions from the audit log (sign-ins, edits, replies). */
export function listOwnActivity(userId: string, take = 8) {
  return db.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, action: true, entity: true, createdAt: true, ipAddress: true },
  });
}

/**
 * Ends every session of this person, on every device, including this one:
 * sessions carry a version that must match the account's (see lib/auth/session).
 */
export async function signOutEverywhere(ctx: ActionContext) {
  await db.user.update({
    where: { id: ctx.user.id },
    data: { sessionVersion: { increment: 1 } },
  });
  await writeAuditLog({
    action: "LOGOUT",
    entity: "User",
    entityId: ctx.user.id,
    userId: ctx.user.id,
    newValue: { everywhere: true },
    request: ctx.request,
  });
  return { id: ctx.user.id };
}
