import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { CurrentUser } from "@/lib/auth/session";
import type { PermissionKey } from "@/lib/permissions/registry";

const { db } = await import("@/lib/db/client");
const { verifyPassword } = await import("@/lib/auth/password");
const users = await import("@/server/services/users");

const tag = randomUUID().slice(0, 6);
const created: string[] = [];
const createdRoles: string[] = [];
let roles: Record<string, { id: string; permissions: PermissionKey[] }>;

/** A throwaway account in the role, so the tests don't depend on the demo seed. */
async function fixtureUser(roleKey: string) {
  const user = await db.user.create({
    data: {
      name: `IT ${roleKey} ${tag}`,
      email: `it-${tag}-${roleKey.toLowerCase()}@example.com`,
      roleId: roles[roleKey]!.id,
      status: "ACTIVE",
    },
  });
  created.push(user.id);
  return user;
}

async function actorFor(roleKey: string, id?: string, extra: PermissionKey[] = []) {
  const role = roles[roleKey]!;
  const user = id
    ? await db.user.findUniqueOrThrow({ where: { id } })
    : ((await db.user.findFirst({
        where: { role: { key: roleKey }, deletedAt: null, status: "ACTIVE" },
      })) ?? (await fixtureUser(roleKey)));
  const current: CurrentUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: null,
    preferredLocale: null,
    role: { key: roleKey, name: roleKey },
    permissions: new Set([...role.permissions, ...extra]),
  };
  return { user: current, request: { ipAddress: null, userAgent: "vitest" } };
}

const input = (roleKey: string, extra: Partial<Record<string, string>> = {}) => ({
  name: `IT ${tag}`,
  email: `it-${tag}-${Math.random().toString(36).slice(2, 7)}@example.com`,
  roleId: roles[roleKey]!.id,
  status: "ACTIVE" as const,
  preferredLocale: null,
  avatarId: null,
  passwordMode: "set" as const,
  password: "Integration-Pass-2026!",
  ...extra,
});

beforeAll(async () => {
  roles = Object.fromEntries(
    (await users.listRoles()).map((r) => [r.key, { id: r.id, permissions: r.permissions }]),
  );
});
afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: created } } });
  await db.role.deleteMany({ where: { id: { in: createdRoles } } });
  await db.$disconnect();
});

describe("privilege escalation", () => {
  it("an Administrator cannot create a Super Administrator", async () => {
    const admin = await actorFor("ADMIN", undefined, ["users.create"]);
    await expect(users.createUser(input("SUPER_ADMIN"), admin)).rejects.toMatchObject({
      code: "forbidden",
      field: "roleId",
    });
  });

  it("an Administrator cannot edit, disable or reset a Super Administrator", async () => {
    const admin = await actorFor("ADMIN");
    const superAdmin = await db.user.findFirstOrThrow({
      where: { role: { key: "SUPER_ADMIN" }, deletedAt: null },
    });
    await expect(users.setUserStatus(superAdmin.id, "DISABLED", admin)).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(
      users.setUserPassword(superAdmin.id, "Stolen-Password-2026!", admin),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(users.sendUserPasswordLink(superAdmin.id, admin)).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("cannot grant permissions to a role that the actor lacks", async () => {
    const admin = await actorFor("ADMIN", undefined, ["roles.manage"]);
    await expect(
      users.createRole(
        { name: `Sneaky ${tag}`, description: null, permissions: ["audit.view", "users.delete"] },
        admin,
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    const editor = roles.CONTENT_EDITOR!;
    await expect(
      users.updateRole(
        editor.id,
        {
          name: "Content Editor",
          description: null,
          permissions: [...editor.permissions, "settings.update"],
        },
        admin,
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("the Super Administrator role always keeps every permission", async () => {
    const superAdmin = await actorFor("SUPER_ADMIN");
    await expect(
      users.updateRole(
        roles.SUPER_ADMIN!.id,
        { name: "Super", description: null, permissions: [] },
        superAdmin,
      ),
    ).rejects.toMatchObject({ messageKey: "superAdminRoleFixed" });
  });
});

describe("lock-out protection", () => {
  it("nobody can disable, delete or demote themselves", async () => {
    const me = await actorFor("SUPER_ADMIN");
    await expect(users.setUserStatus(me.user.id, "DISABLED", me)).rejects.toMatchObject({
      messageKey: "cannotChangeOwnAccess",
    });
    await expect(users.deleteUser(me.user.id, me)).rejects.toMatchObject({
      messageKey: "cannotChangeOwnAccess",
    });
    const self = await db.user.findUniqueOrThrow({ where: { id: me.user.id } });
    await expect(
      users.updateUser(
        me.user.id,
        {
          name: self.name,
          email: self.email,
          roleId: roles.VIEWER!.id,
          status: "ACTIVE",
          preferredLocale: null,
          avatarId: null,
        },
        me,
      ),
    ).rejects.toMatchObject({ messageKey: "cannotChangeOwnAccess" });
  });

  it("the last active Super Administrator can't be removed", async () => {
    const actives = await db.user.findMany({
      where: { role: { key: "SUPER_ADMIN" }, deletedAt: null, status: "ACTIVE" },
    });
    const main = actives[0]!;
    // A second super admin acts on the first; the first is then the last one standing when others are disabled.
    const second = await users.createUser(
      input("SUPER_ADMIN"),
      await actorFor("SUPER_ADMIN", main.id),
    );
    created.push(second.id);
    const actor = await actorFor("SUPER_ADMIN", second.id);
    const others = actives.slice(1).map((u) => u.id);
    await db.user.updateMany({ where: { id: { in: others } }, data: { status: "DISABLED" } });
    try {
      await users.setUserStatus(second.id, "DISABLED", await actorFor("SUPER_ADMIN", main.id)); // fine: main remains
      await users.setUserStatus(second.id, "ACTIVE", await actorFor("SUPER_ADMIN", main.id));
      await db.user.update({ where: { id: second.id }, data: { status: "DISABLED" } });
      await expect(users.deleteUser(main.id, actor)).rejects.toMatchObject({
        messageKey: "lastSuperAdmin",
      });
    } finally {
      await db.user.updateMany({ where: { id: { in: others } }, data: { status: "ACTIVE" } });
    }
  });
});

describe("user lifecycle", () => {
  it("creates, updates, resets and deletes a user; sessions are revoked", async () => {
    const actor = await actorFor("SUPER_ADMIN");
    const { id } = await users.createUser(input("CONTENT_EDITOR"), actor);
    created.push(id);
    let row = await db.user.findUniqueOrThrow({ where: { id } });
    expect(await verifyPassword(row.passwordHash!, "Integration-Pass-2026!")).toBe(true);
    const v0 = row.sessionVersion;

    await expect(
      users.createUser({ ...input("VIEWER"), email: row.email }, actor),
    ).rejects.toMatchObject({ code: "conflict", field: "email" });

    await users.setUserStatus(id, "DISABLED", actor);
    row = await db.user.findUniqueOrThrow({ where: { id } });
    expect(row.status).toBe("DISABLED");
    expect(row.sessionVersion).toBe(v0 + 1);

    await users.setUserPassword(id, "Another-Strong-Pass-2026", actor);
    row = await db.user.findUniqueOrThrow({ where: { id } });
    expect(await verifyPassword(row.passwordHash!, "Another-Strong-Pass-2026")).toBe(true);
    expect(row.sessionVersion).toBe(v0 + 2);

    const email = row.email;
    await users.deleteUser(id, actor);
    row = await db.user.findUniqueOrThrow({ where: { id } });
    expect(row.deletedAt).not.toBeNull();
    expect(row.passwordHash).toBeNull();
    expect(row.email).not.toBe(email); // freed for reuse
    const actions = (
      await db.auditLog.findMany({ where: { entityId: id }, orderBy: { createdAt: "asc" } })
    ).map((a) => a.action);
    expect(actions).toEqual(["CREATE", "STATUS_CHANGE", "PASSWORD_RESET", "DELETE"]);
  });

  it("emails a setup link when no password is given", async () => {
    const actor = await actorFor("SUPER_ADMIN");
    const log = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const result = await users.createUser(
      { ...input("VIEWER"), passwordMode: "email", password: undefined },
      actor,
    );
    const printed = log.mock.calls.flat().join("\n");
    log.mockRestore();
    created.push(result.id);
    expect(result).toMatchObject({ needsLink: true, linkSent: true });
    expect(printed).toContain("/admin/reset-password?token=");
    expect((await db.user.findUniqueOrThrow({ where: { id: result.id } })).passwordHash).toBeNull();
  });

  it("creates and deletes custom roles; system roles and roles in use are protected", async () => {
    const actor = await actorFor("SUPER_ADMIN");
    const { id } = await users.createRole(
      {
        name: `Site Engineer ${tag}`,
        description: "Projects only",
        permissions: ["projects.view", "projects.update"],
      },
      actor,
    );
    createdRoles.push(id);
    expect((await db.role.findUniqueOrThrow({ where: { id } })).key).toMatch(
      /^CUSTOM_SITE_ENGINEER/,
    );
    await expect(users.deleteRole(roles.VIEWER!.id, actor)).rejects.toMatchObject({
      messageKey: "systemRole",
    });
    await users.deleteRole(id, actor);
    expect(await db.role.findUnique({ where: { id } })).toBeNull();
  });
});
