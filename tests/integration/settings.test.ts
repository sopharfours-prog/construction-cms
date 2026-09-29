import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { CurrentUser } from "@/lib/auth/session";
import { allPermissions } from "@/lib/permissions/registry";

const { db } = await import("@/lib/db/client");
const { updateSettings, setLanguageEnabled, getEnabledLocales } =
  await import("@/server/services/site-settings");

let ctx: { user: CurrentUser; request: { ipAddress: null; userAgent: string } };
let original: { statistics: unknown; seo: unknown };
const docId = randomUUID();

beforeAll(async () => {
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
    request: { ipAddress: null, userAgent: "vitest" },
  };
  original = {
    statistics: (await db.setting.findUnique({ where: { key: "statistics" } }))?.value,
    seo: (await db.setting.findUnique({ where: { key: "seo" } }))?.value,
  };
  await db.media.create({
    data: {
      id: docId,
      kind: "DOCUMENT",
      filename: "x.pdf",
      originalName: "x.pdf",
      mimeType: "application/pdf",
      size: 1,
      storageKey: `public/media/2026/09/${docId}.pdf`,
      url: "/x.pdf",
    },
  });
});
afterAll(async () => {
  await db.setting.update({
    where: { key: "statistics" },
    data: { value: original.statistics as object },
  });
  await db.setting.update({ where: { key: "seo" }, data: { value: original.seo as object } });
  await db.language.update({ where: { code: "en" }, data: { enabled: true } });
  await db.media.delete({ where: { id: docId } });
  await db.$disconnect();
});

describe("website settings", () => {
  it("saves a group and audits old and new values", async () => {
    await updateSettings(
      "statistics",
      { yearsOfExperience: 21, clients: 150, teamMembers: null },
      ctx,
    );
    expect((await db.setting.findUniqueOrThrow({ where: { key: "statistics" } })).value).toEqual({
      yearsOfExperience: 21,
      clients: 150,
      teamMembers: null,
    });
    const audit = await db.auditLog.findFirstOrThrow({
      where: { entity: "Setting", entityId: "statistics" },
      orderBy: { createdAt: "desc" },
    });
    expect(audit.action).toBe("SETTINGS_CHANGE");
    expect(audit.newValue).toMatchObject({ yearsOfExperience: 21 });
    expect(audit.oldValue).not.toBeNull();
  });

  it("only accepts live images for share images and logos", async () => {
    const seo = (await db.setting.findUniqueOrThrow({ where: { key: "seo" } })).value as Record<
      string,
      unknown
    >;
    await expect(
      updateSettings("seo", { ...seo, ogImageMediaId: docId } as never, ctx),
    ).rejects.toMatchObject({ field: "ogImageMediaId", messageKey: "mediaInvalid" });
  });

  it("switches languages but never the main one", async () => {
    await expect(setLanguageEnabled("lo", false, ctx)).rejects.toMatchObject({
      messageKey: "defaultLanguageRequired",
    });
    await expect(setLanguageEnabled("fr", true, ctx)).rejects.toMatchObject({ code: "notFound" });
    await setLanguageEnabled("en", false, ctx);
    expect(await getEnabledLocales()).toEqual(["lo"]);
    await setLanguageEnabled("en", true, ctx);
  });
});
