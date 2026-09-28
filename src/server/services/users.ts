import "server-only";

import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { pageParam, paginate, stringParam } from "@/lib/admin/list-params";
import { hashPassword } from "@/lib/auth/password";
import type { PermissionKey } from "@/lib/permissions/registry";
import { db } from "@/lib/db/client";
import type { RoleInput, UserCreateInput, UserUpdateInput } from "@/lib/validation/users";
import { writeAuditLog } from "@/server/services/audit";
import { issuePasswordLink } from "@/server/services/auth/password-reset";
import { type ActionContext, ContentError } from "@/server/services/errors";
import { assertImages } from "@/server/services/media/media";

export const SUPER_ADMIN_ROLE = "SUPER_ADMIN";

export const userListSchema = z.object({
  page: pageParam,
  q: stringParam(200),
  role: z.uuid().optional().catch(undefined),
  status: z.enum(["ACTIVE", "DISABLED"]).optional().catch(undefined),
});
export type UserListFilters = z.infer<typeof userListSchema>;

const userSelect = {
  id: true,
  name: true,
  email: true,
  status: true,
  lastLoginAt: true,
  lockedUntil: true,
  createdAt: true,
  preferredLocale: true,
  roleId: true,
  role: { select: { id: true, key: true, name: true } },
  avatar: {
    select: {
      id: true,
      url: true,
      altText: true,
      blurDataUrl: true,
      originalName: true,
      kind: true,
      mimeType: true,
    },
  },
} satisfies Prisma.UserSelect;

export async function listUsers(filters: UserListFilters) {
  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(filters.role ? { roleId: filters.role } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.q
      ? {
          OR: [
            { name: { contains: filters.q, mode: "insensitive" } },
            { email: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const total = await db.user.count({ where });
  const { page, pageCount, skip, take } = paginate(total, filters.page);
  const rows = await db.user.findMany({
    where,
    orderBy: [{ status: "asc" }, { name: "asc" }],
    skip,
    take,
    select: userSelect,
  });
  return { rows, total, page, pageCount };
}

export function getUser(id: string) {
  return db.user.findFirst({ where: { id, deletedAt: null }, select: userSelect });
}

export async function listRoles() {
  const roles = await db.role.findMany({
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      isSystem: true,
      permissions: { select: { permission: { select: { key: true } } } },
      _count: { select: { users: { where: { deletedAt: null } } } },
    },
  });
  return roles.map(({ permissions, _count, ...r }) => ({
    ...r,
    permissions: permissions.map((p) => p.permission.key as PermissionKey),
    userCount: _count.users,
  }));
}

// ─── Guards against privilege escalation and lock-out ───────────────────────

async function rolePermissions(roleId: string): Promise<Set<string>> {
  const role = await db.role.findUnique({
    where: { id: roleId },
    select: { permissions: { select: { permission: { select: { key: true } } } } },
  });
  if (!role) throw new ContentError("validation", "roleId", "invalid");
  return new Set(role.permissions.map((p) => p.permission.key));
}

/** Nobody can hand out, or act on someone holding, permissions they don't have themselves. */
function assertWithinActor(ctx: ActionContext, permissions: Set<string>, field?: string) {
  for (const key of permissions) {
    if (!ctx.user.permissions.has(key as PermissionKey))
      throw new ContentError("forbidden", field, "beyondYourPermissions");
  }
}

async function loadTarget(id: string, ctx: ActionContext) {
  const target = await db.user.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      roleId: true,
      role: { select: { key: true } },
    },
  });
  if (!target) throw new ContentError("notFound");
  assertWithinActor(ctx, await rolePermissions(target.roleId));
  return target;
}

/** At least one active Super Administrator must always remain. */
async function assertNotLastSuperAdmin(target: { id: string; role: { key: string } }) {
  if (target.role.key !== SUPER_ADMIN_ROLE) return;
  const others = await db.user.count({
    where: {
      id: { not: target.id },
      deletedAt: null,
      status: "ACTIVE",
      role: { key: SUPER_ADMIN_ROLE },
    },
  });
  if (others === 0) throw new ContentError("validation", undefined, "lastSuperAdmin");
}

async function assertEmailFree(email: string, exceptId?: string) {
  const clash = await db.user.findFirst({
    where: { email, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  if (clash) throw new ContentError("conflict", "email", "emailTaken");
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function createUser(input: UserCreateInput, ctx: ActionContext) {
  assertWithinActor(ctx, await rolePermissions(input.roleId), "roleId");
  await assertEmailFree(input.email);
  if (input.avatarId) await assertImages([input.avatarId], "avatarId");
  const passwordHash =
    input.passwordMode === "set" && input.password ? await hashPassword(input.password) : null;

  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        roleId: input.roleId,
        status: input.status,
        preferredLocale: input.preferredLocale,
        avatarId: input.avatarId,
        passwordHash,
      },
      select: { id: true, email: true, preferredLocale: true },
    });
    await writeAuditLog(
      {
        action: "CREATE",
        entity: "User",
        entityId: created.id,
        userId: ctx.user.id,
        newValue: {
          name: input.name,
          email: input.email,
          roleId: input.roleId,
          status: input.status,
          passwordMode: input.passwordMode,
        },
        request: ctx.request,
      },
      tx,
    );
    return created;
  });

  // The account exists either way; a mail failure is reported so staff can resend.
  let linkSent = false;
  if (!passwordHash && input.status === "ACTIVE") {
    try {
      await issuePasswordLink(user);
      linkSent = true;
    } catch (error) {
      console.error("[users] setup link failed", error);
    }
  }
  return { id: user.id, linkSent, needsLink: !passwordHash };
}

export async function updateUser(id: string, input: UserUpdateInput, ctx: ActionContext) {
  const target = await loadTarget(id, ctx);
  const self = id === ctx.user.id;
  if (self && (input.roleId !== target.roleId || input.status !== "ACTIVE"))
    throw new ContentError(
      "validation",
      input.roleId !== target.roleId ? "roleId" : "status",
      "cannotChangeOwnAccess",
    );
  if (input.roleId !== target.roleId)
    assertWithinActor(ctx, await rolePermissions(input.roleId), "roleId");
  if (target.status === "ACTIVE" && (input.status !== "ACTIVE" || input.roleId !== target.roleId))
    await assertNotLastSuperAdmin(target);
  await assertEmailFree(input.email, id);
  if (input.avatarId) await assertImages([input.avatarId], "avatarId");

  const revoke = input.status !== target.status || input.email !== target.email;
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: {
        name: input.name,
        email: input.email,
        roleId: input.roleId,
        status: input.status,
        preferredLocale: input.preferredLocale,
        avatarId: input.avatarId,
        // Disabling or changing the sign-in email ends existing sessions.
        ...(revoke ? { sessionVersion: { increment: 1 } } : {}),
      },
    });
    const action =
      input.roleId !== target.roleId
        ? "PERMISSION_CHANGE"
        : input.status !== target.status
          ? "STATUS_CHANGE"
          : "UPDATE";
    await writeAuditLog(
      {
        action,
        entity: "User",
        entityId: id,
        userId: ctx.user.id,
        oldValue: {
          name: target.name,
          email: target.email,
          roleId: target.roleId,
          status: target.status,
        },
        newValue: {
          name: input.name,
          email: input.email,
          roleId: input.roleId,
          status: input.status,
        },
        request: ctx.request,
      },
      tx,
    );
  });
  return { id };
}

export async function setUserStatus(id: string, status: "ACTIVE" | "DISABLED", ctx: ActionContext) {
  const target = await loadTarget(id, ctx);
  if (id === ctx.user.id) throw new ContentError("validation", undefined, "cannotChangeOwnAccess");
  if (target.status === status) return { id };
  if (status === "DISABLED") await assertNotLastSuperAdmin(target);
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: {
        status,
        sessionVersion: { increment: 1 },
        ...(status === "ACTIVE" ? { failedLoginAttempts: 0, lockedUntil: null } : {}),
      },
    });
    await writeAuditLog(
      {
        action: "STATUS_CHANGE",
        entity: "User",
        entityId: id,
        userId: ctx.user.id,
        oldValue: { status: target.status },
        newValue: { status },
        request: ctx.request,
      },
      tx,
    );
  });
  return { id };
}

/** Soft delete: kept for the audit trail and authored content; the email is freed. */
export async function deleteUser(id: string, ctx: ActionContext) {
  const target = await loadTarget(id, ctx);
  if (id === ctx.user.id) throw new ContentError("validation", undefined, "cannotChangeOwnAccess");
  await assertNotLastSuperAdmin(target);
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "DISABLED",
        email: `deleted-${id}@invalid.local`,
        passwordHash: null,
        sessionVersion: { increment: 1 },
      },
    });
    await tx.passwordResetToken.deleteMany({ where: { userId: id } });
    await tx.inquiry.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } });
    await tx.quoteRequest.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } });
    await writeAuditLog(
      {
        action: "DELETE",
        entity: "User",
        entityId: id,
        userId: ctx.user.id,
        oldValue: { name: target.name, email: target.email, roleId: target.roleId },
        request: ctx.request,
      },
      tx,
    );
  });
  return { id };
}

/** Staff sets a new password: every session of that user ends. */
export async function setUserPassword(id: string, newPassword: string, ctx: ActionContext) {
  await loadTarget(id, ctx);
  const passwordHash = await hashPassword(newPassword);
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: {
        passwordHash,
        sessionVersion: { increment: 1 },
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    await tx.passwordResetToken.updateMany({
      where: { userId: id, usedAt: null },
      data: { usedAt: new Date() },
    });
    await writeAuditLog(
      {
        action: "PASSWORD_RESET",
        entity: "User",
        entityId: id,
        userId: ctx.user.id,
        newValue: { by: "staff" },
        request: ctx.request,
      },
      tx,
    );
  });
  return { id };
}

export async function sendUserPasswordLink(id: string, ctx: ActionContext) {
  const target = await loadTarget(id, ctx);
  if (target.status !== "ACTIVE") throw new ContentError("validation", undefined, "userDisabled");
  const user = await db.user.findUniqueOrThrow({
    where: { id },
    select: { id: true, email: true, preferredLocale: true },
  });
  try {
    await issuePasswordLink(user);
  } catch (error) {
    console.error("[users] reset link failed", error);
    throw new ContentError("validation", undefined, "mailFailed");
  }
  await writeAuditLog({
    action: "PASSWORD_RESET",
    entity: "User",
    entityId: id,
    userId: ctx.user.id,
    newValue: { by: "emailed link" },
    request: ctx.request,
  });
  return { id };
}

// ─── Roles ───────────────────────────────────────────────────────────────────

const roleKeyFrom = (name: string) =>
  `CUSTOM_${
    name
      .normalize("NFKD")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "ROLE"
  }`;

async function permissionIds(keys: string[]) {
  const rows = await db.permission.findMany({ where: { key: { in: keys } }, select: { id: true } });
  if (rows.length !== keys.length) throw new ContentError("validation", "permissions", "invalid");
  return rows.map((r) => r.id);
}

export async function createRole(input: RoleInput, ctx: ActionContext) {
  assertWithinActor(ctx, new Set(input.permissions), "permissions");
  let key = roleKeyFrom(input.name);
  if (await db.role.findUnique({ where: { key } }))
    key = `${key.slice(0, 40)}_${Date.now().toString(36).toUpperCase()}`;
  const ids = await permissionIds(input.permissions);
  return db.$transaction(async (tx) => {
    const role = await tx.role.create({
      data: {
        key,
        name: input.name,
        description: input.description,
        permissions: { create: ids.map((permissionId) => ({ permissionId })) },
      },
    });
    await writeAuditLog(
      {
        action: "PERMISSION_CHANGE",
        entity: "Role",
        entityId: role.id,
        userId: ctx.user.id,
        newValue: { name: input.name, permissions: input.permissions },
        request: ctx.request,
      },
      tx,
    );
    return { id: role.id };
  });
}

/**
 * Change a role's permissions. The Super Administrator role always keeps
 * every permission; nobody can grant or remove permissions they don't hold,
 * or change the role they are using themselves.
 */
export async function updateRole(id: string, input: RoleInput, ctx: ActionContext) {
  const role = await db.role.findUnique({
    where: { id },
    select: {
      id: true,
      key: true,
      name: true,
      permissions: { select: { permission: { select: { key: true } } } },
    },
  });
  if (!role) throw new ContentError("notFound");
  if (role.key === SUPER_ADMIN_ROLE)
    throw new ContentError("validation", "permissions", "superAdminRoleFixed");
  const current = new Set(role.permissions.map((p) => p.permission.key));
  const next = new Set<string>(input.permissions);
  const changed = [...current, ...next].filter((k) => current.has(k) !== next.has(k));
  assertWithinActor(ctx, new Set(changed), "permissions");
  if (role.key === ctx.user.role.key && changed.length)
    throw new ContentError("validation", "permissions", "cannotChangeOwnAccess");

  const ids = await permissionIds(input.permissions);
  await db.$transaction(async (tx) => {
    await tx.role.update({
      where: { id },
      data: { name: input.name, description: input.description },
    });
    await tx.rolePermission.deleteMany({ where: { roleId: id } });
    await tx.rolePermission.createMany({
      data: ids.map((permissionId) => ({ roleId: id, permissionId })),
    });
    await writeAuditLog(
      {
        action: "PERMISSION_CHANGE",
        entity: "Role",
        entityId: id,
        userId: ctx.user.id,
        oldValue: { name: role.name, permissions: [...current].sort() },
        newValue: { name: input.name, permissions: [...next].sort() },
        request: ctx.request,
      },
      tx,
    );
  });
  return { id };
}

export async function deleteRole(id: string, ctx: ActionContext) {
  const role = await db.role.findUnique({
    where: { id },
    select: {
      id: true,
      key: true,
      name: true,
      isSystem: true,
      _count: { select: { users: { where: { deletedAt: null } } } },
    },
  });
  if (!role) throw new ContentError("notFound");
  if (role.isSystem) throw new ContentError("validation", undefined, "systemRole");
  if (role._count.users > 0) throw new ContentError("conflict", undefined, "roleInUse");
  await db.$transaction(async (tx) => {
    await tx.role.delete({ where: { id } });
    await writeAuditLog(
      {
        action: "PERMISSION_CHANGE",
        entity: "Role",
        entityId: id,
        userId: ctx.user.id,
        oldValue: { name: role.name, key: role.key },
        request: ctx.request,
      },
      tx,
    );
  });
  return { id };
}
