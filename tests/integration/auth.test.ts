import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { MailMessage } from "@/lib/mail/mailer";

const sent: MailMessage[] = [];
vi.mock("@/lib/mail/mailer", () => ({
  sendMail: async (message: MailMessage) => {
    sent.push(message);
  },
}));

const { db } = await import("@/lib/db/client");
const { hashPassword } = await import("@/lib/auth/password");
const { authenticateWithPassword } = await import("@/server/services/auth/login");
const { requestPasswordReset, resetPassword } =
  await import("@/server/services/auth/password-reset");
const { consumeRateLimit } = await import("@/server/services/rate-limit");

const request = { ipAddress: null, userAgent: "vitest" };
const email = `reset-test-${randomUUID()}@example.com`;
const oldPassword = "Old-Password-For-Test-1";
const newPassword = "New-Password-For-Test-2";
let userId: string;

function tokenFromLastMail(): string {
  const match = sent.at(-1)?.text.match(/token=([A-Za-z0-9_-]{43})/);
  if (!match?.[1]) throw new Error("no reset link in email");
  return decodeURIComponent(match[1]);
}

beforeAll(async () => {
  const role = await db.role.findUniqueOrThrow({ where: { key: "VIEWER" } });
  const user = await db.user.create({
    data: {
      name: "Reset Test",
      email,
      passwordHash: await hashPassword(oldPassword),
      roleId: role.id,
    },
  });
  userId = user.id;
});

afterAll(async () => {
  await db.user.delete({ where: { id: userId } });
  await db.rateLimit.deleteMany({ where: { key: { startsWith: "test:" } } });
  await db.$disconnect();
});

beforeEach(async () => {
  sent.length = 0;
  await db.rateLimit.deleteMany({
    where: { OR: [{ key: { startsWith: "reset:" } }, { key: { startsWith: "login" } }] },
  });
});

describe("rate limiter", () => {
  it("admits exactly `limit` requests under concurrency", async () => {
    const key = `test:${randomUUID()}`;
    const results = await Promise.all(
      Array.from({ length: 30 }, () => consumeRateLimit(key, { limit: 5, windowSeconds: 60 })),
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(5);
    expect(Math.max(...results.map((r) => r.count))).toBe(30);
    expect(results.find((r) => !r.allowed)?.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe("password reset", () => {
  it("sends nothing and does not throw for an unknown email", async () => {
    await requestPasswordReset(`nobody-${randomUUID()}@example.com`, request);
    expect(sent).toHaveLength(0);
  });

  it("stores only a hash of the token", async () => {
    await requestPasswordReset(email, request);
    const token = tokenFromLastMail();
    const rows = await db.passwordResetToken.findMany({ where: { userId } });
    expect(rows.some((r) => r.tokenHash === token)).toBe(false);
    expect(rows.every((r) => /^[0-9a-f]{64}$/.test(r.tokenHash))).toBe(true);
  });

  it("invalidates an older link when a new one is requested", async () => {
    await requestPasswordReset(email, request);
    const first = tokenFromLastMail();
    await requestPasswordReset(email, request);
    expect(await resetPassword(first, newPassword, request)).toEqual({
      ok: false,
      reason: "invalid_or_expired",
    });
  });

  it("resets once, revokes sessions, and swaps the password", async () => {
    await requestPasswordReset(email, request);
    const token = tokenFromLastMail();
    const before = await db.user.findUniqueOrThrow({ where: { id: userId } });

    // Two concurrent submits of the same link: exactly one succeeds.
    const results = await Promise.all([
      resetPassword(token, newPassword, request),
      resetPassword(token, newPassword, request),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);

    const after = await db.user.findUniqueOrThrow({ where: { id: userId } });
    expect(after.sessionVersion).toBe(before.sessionVersion + 1);
    expect(await resetPassword(token, "Another-Password-99", request)).toMatchObject({ ok: false });

    expect((await authenticateWithPassword({ email, password: oldPassword }, request)).ok).toBe(
      false,
    );
    expect((await authenticateWithPassword({ email, password: newPassword }, request)).ok).toBe(
      true,
    );

    const audit = await db.auditLog.count({
      where: { entityId: userId, action: "PASSWORD_RESET" },
    });
    expect(audit).toBe(1);
  });

  it("rejects an expired link", async () => {
    await requestPasswordReset(email, request);
    const token = tokenFromLastMail();
    await db.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await resetPassword(token, "Yet-Another-Password-1", request)).toMatchObject({
      ok: false,
    });
  });

  it("is rate limited per email (3 per hour)", async () => {
    for (let i = 0; i < 5; i++) await requestPasswordReset(email, request);
    expect(sent).toHaveLength(3);
  });
});
