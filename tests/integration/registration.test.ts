import { randomUUID } from "node:crypto";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { CurrentUser } from "@/lib/auth/session";
import type { MailMessage } from "@/lib/mail/mailer";
import { allPermissions } from "@/lib/permissions/registry";

const sent: MailMessage[] = [];
vi.mock("@/lib/mail/mailer", () => ({
  sendMail: async (message: MailMessage) => {
    sent.push(message);
  },
}));

const { db } = await import("@/lib/db/client");
const { getServerEnv } = await import("@/lib/env/server");
const { createFormToken } = await import("@/lib/security/form-token");
const { authenticateWithPassword } = await import("@/server/services/auth/login");
const { notifyAdministrators, requestStaffAccount } =
  await import("@/server/services/auth/registration");
const { listUsers, setUserStatus, updateUser } = await import("@/server/services/users");

const run = randomUUID().slice(0, 8);
const address = (name: string) => `register-${run}-${name}@example.com`;
const password = "Applicant-Password-2026";
const request = { ipAddress: `198.51.100.${Math.floor(Math.random() * 200)}`, userAgent: "vitest" };
const token = () => createFormToken(getServerEnv().AUTH_SECRET, Date.now() - 10_000);
const apply = (email: string, guard: { website?: string; formToken?: string } = {}) =>
  requestStaffAccount(
    { name: "New Colleague", email, password },
    { formToken: token(), ...guard },
    request,
  );
const find = (email: string) => db.user.findUnique({ where: { email } });
let ctx: { user: CurrentUser; request: typeof request };

beforeAll(async () => {
  await db.rateLimit.deleteMany({});
  const admin = await db.user.findFirstOrThrow({ where: { email: "admin@example.com" } });
  ctx = {
    user: {
      id: admin.id,
      name: "IT",
      email: admin.email,
      avatarUrl: null,
      preferredLocale: null,
      role: { key: "SUPER_ADMIN", name: "S" },
      permissions: new Set(allPermissions.map((p) => p.key)),
    },
    request,
  };
});
afterEach(() => {
  delete process.env.ALLOW_REGISTRATION;
});
afterAll(async () => {
  await db.user.deleteMany({ where: { email: { startsWith: `register-${run}-` } } });
  await db.$disconnect();
});

describe("staff registration requests", () => {
  it("creates a pending account that cannot sign in, and tells the administrators", async () => {
    const email = address("a");
    const result = await apply(email.toUpperCase());
    expect(result).toMatchObject({ ok: true, created: { email } });
    const user = await find(email);
    expect(user?.status).toBe("PENDING");
    if (result.ok && result.created) await notifyAdministrators(result.created);
    expect(user?.passwordHash).not.toContain(password);
    expect(sent.at(-1)?.text).toContain(`/admin/users/${user!.id}`);
    expect(await authenticateWithPassword({ email, password }, request)).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("gives the same answer for an email that already has an account, and changes nothing", async () => {
    const email = address("a");
    const before = await find(email);
    expect(await apply(email)).toEqual({ ok: true });
    expect(await db.user.count({ where: { email } })).toBe(1);
    expect((await find(email))?.updatedAt).toEqual(before?.updatedAt);
    // An existing staff account is never touched either.
    expect(await apply("admin@example.com")).toEqual({ ok: true });
    expect((await find("admin@example.com"))?.status).toBe("ACTIVE");
  });

  it("stores nothing for bots, bad tokens or when registration is switched off", async () => {
    expect(await apply(address("bot"), { website: "http://spam.example" })).toEqual({ ok: true });
    expect(
      await apply(address("fast"), { formToken: createFormToken(getServerEnv().AUTH_SECRET) }),
    ).toEqual({
      ok: false,
      reason: "retry",
    });
    expect(await apply(address("none"), { formToken: "" })).toEqual({ ok: false, reason: "retry" });
    process.env.ALLOW_REGISTRATION = "false";
    expect(await apply(address("closed"))).toEqual({ ok: false, reason: "closed" });
    for (const name of ["bot", "fast", "none", "closed"])
      expect(await find(address(name))).toBeNull();
  });

  it("limits requests per connection", async () => {
    const flood = { ...request, ipAddress: "198.51.100.250" };
    const results = [];
    for (let i = 0; i < 6; i++)
      results.push(
        await requestStaffAccount(
          { name: "Flood", email: address(`flood${i}`), password },
          { formToken: token() },
          flood,
        ),
      );
    expect(results.slice(0, 5).every((r) => r.ok)).toBe(true);
    expect(results[5]).toEqual({ ok: false, reason: "rateLimited" });
    expect(await find(address("flood5"))).toBeNull();
  });

  it("lists requests waiting for approval first, on the first page", async () => {
    const all = await listUsers({ page: 1 });
    const pending = await db.user.count({ where: { status: "PENDING", deletedAt: null } });
    expect(pending).toBeGreaterThan(0);
    const firstRows = all.rows.slice(0, Math.min(pending, all.rows.length));
    expect(firstRows.every((row) => row.status === "PENDING")).toBe(true);
    expect(all.total).toBe(await db.user.count({ where: { deletedAt: null } }));
  });

  it("is approved only by choosing a role and activating in the user form", async () => {
    const email = address("a");
    const user = (await find(email))!;
    // The quick enable/disable toggle can't approve a request (no role chosen).
    await expect(setUserStatus(user.id, "ACTIVE", ctx)).rejects.toMatchObject({ field: "status" });
    const editor = await db.role.findUniqueOrThrow({ where: { key: "CONTENT_EDITOR" } });
    await updateUser(
      user.id,
      {
        name: user.name,
        email,
        roleId: editor.id,
        status: "ACTIVE",
        preferredLocale: null,
        avatarId: null,
      },
      ctx,
    );
    const result = await authenticateWithPassword({ email, password }, request);
    expect(result.ok).toBe(true);
    // The applicant hears about it, with a link to sign in.
    expect(sent.at(-1)?.to).toBe(email);
    expect(sent.at(-1)?.text).toContain("/admin/login");
    // Once decided, an account can't be put back to pending.
    await expect(
      updateUser(
        user.id,
        {
          name: user.name,
          email,
          roleId: editor.id,
          status: "PENDING",
          preferredLocale: null,
          avatarId: null,
        },
        ctx,
      ),
    ).rejects.toMatchObject({ field: "status" });
  });
});
