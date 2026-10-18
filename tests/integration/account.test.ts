import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { CurrentUser } from "@/lib/auth/session";

process.env.STORAGE_DRIVER = "local";
process.env.LOCAL_STORAGE_DIR = await mkdtemp(path.join(tmpdir(), "cms-account-"));

const sharp = (await import("sharp")).default;
const { db } = await import("@/lib/db/client");
const { profileInputSchema } = await import("@/lib/validation/users");
const account = await import("@/server/services/account");

const run = Math.random().toString(36).slice(2, 8);
const request = { ipAddress: "192.0.2.10", userAgent: "vitest" };
let person: { id: string; email: string };
let ctx: { user: CurrentUser; request: typeof request };

beforeAll(async () => {
  await db.rateLimit.deleteMany({});
  // A Viewer: no media.upload, no users.update. A profile needs neither.
  const viewer = await db.role.findUniqueOrThrow({ where: { key: "VIEWER" } });
  person = await db.user.create({
    data: { name: "Profile Test", email: `profile-${run}@example.com`, roleId: viewer.id },
    select: { id: true, email: true },
  });
  ctx = {
    user: {
      id: person.id,
      name: "Profile Test",
      email: person.email,
      avatarUrl: null,
      preferredLocale: null,
      role: { key: "VIEWER", name: "Viewer" },
      permissions: new Set(),
    },
    request,
  };
});
afterAll(async () => {
  await db.user.update({ where: { id: person.id }, data: { avatarId: null } });
  await db.media.deleteMany({ where: { uploadedById: person.id } });
  await db.user.deleteMany({ where: { id: person.id } });
  await db.$disconnect();
});

describe("own profile", () => {
  it("changes only name and language, never email or role", async () => {
    // Extra fields are dropped by the schema: a profile can't change email, role or status.
    const input = profileInputSchema.parse({
      name: "  New Name ",
      preferredLocale: "en",
      email: "attacker@example.com",
      roleId: "00000000-0000-0000-0000-000000000000",
      status: "DISABLED",
    });
    expect(input).toEqual({ name: "New Name", preferredLocale: "en" });
    await account.updateOwnProfile(input, ctx);
    const row = await db.user.findUniqueOrThrow({ where: { id: person.id } });
    expect(row).toMatchObject({ name: "New Name", preferredLocale: "en", email: person.email });
    expect(row.status).toBe("ACTIVE");
    const log = await db.auditLog.findFirst({
      where: { entity: "User", entityId: person.id, action: "UPDATE" },
      orderBy: { createdAt: "desc" },
    });
    expect(log?.userId).toBe(person.id);
    expect(log?.newValue).toMatchObject({ name: "New Name", by: "self" });
  });

  it("sets a photo without media-library permissions, and refuses anything but an image", async () => {
    const png = await sharp({
      create: { width: 64, height: 64, channels: 3, background: "#14325a" },
    })
      .png()
      .toBuffer();
    const { avatarUrl } = await account.setOwnAvatar({ name: "me.png", buffer: png }, ctx);
    expect(avatarUrl).toBeTruthy();
    const withPhoto = await db.user.findUniqueOrThrow({
      where: { id: person.id },
      include: { avatar: true },
    });
    expect(withPhoto.avatar?.uploadedById).toBe(person.id);
    expect(withPhoto.avatar?.kind).toBe("IMAGE");

    const pdf = Buffer.from("%PDF-1.4\n%test\n");
    await expect(account.setOwnAvatar({ name: "cv.pdf", buffer: pdf }, ctx)).rejects.toMatchObject({
      field: "file",
      messageKey: "fileType",
    });

    await account.removeOwnAvatar(ctx);
    expect((await db.user.findUniqueOrThrow({ where: { id: person.id } })).avatarId).toBeNull();
  });

  it("lists only the person's own activity, newest first", async () => {
    const activity = await account.listOwnActivity(person.id);
    expect(activity.length).toBeGreaterThan(0);
    const others = await db.auditLog.count({
      where: { id: { in: activity.map((a) => a.id) }, NOT: { userId: person.id } },
    });
    expect(others).toBe(0);
    const times = activity.map((a) => a.createdAt.getTime());
    expect(times).toEqual([...times].sort((x, y) => y - x));
  });

  it("signs out everywhere by retiring every session, and records it", async () => {
    const before = await db.user.findUniqueOrThrow({ where: { id: person.id } });
    await account.signOutEverywhere(ctx);
    const after = await db.user.findUniqueOrThrow({ where: { id: person.id } });
    // Sessions carry the version they were issued with; none match any more.
    expect(after.sessionVersion).toBe(before.sessionVersion + 1);
    const log = await db.auditLog.findFirst({
      where: { entity: "User", entityId: person.id, action: "LOGOUT" },
      orderBy: { createdAt: "desc" },
    });
    expect(log?.newValue).toMatchObject({ everywhere: true });
  });
});
