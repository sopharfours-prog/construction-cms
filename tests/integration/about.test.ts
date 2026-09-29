import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { CurrentUser } from "@/lib/auth/session";
import { allPermissions } from "@/lib/permissions/registry";

const { db } = await import("@/lib/db/client");
const { formDataToObject } = await import("@/lib/content/form-data");
const { certificationSchema, milestoneSchema, teamMemberSchema } =
  await import("@/lib/validation/about");
const about = await import("@/server/services/about");
const { getAboutData } = await import("@/server/public/content");

let ctx: { user: CurrentUser; request: { ipAddress: null; userAgent: string } };
const made: { team: string[]; cert: string[]; milestone: string[] } = {
  team: [],
  cert: [],
  milestone: [],
};
const parse = <T>(schema: { parse: (v: unknown) => T }, fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return schema.parse(formDataToObject(fd));
};

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
});
afterAll(async () => {
  await db.teamMember.deleteMany({ where: { id: { in: made.team } } });
  await db.certification.deleteMany({ where: { id: { in: made.cert } } });
  await db.milestone.deleteMany({ where: { id: { in: made.milestone } } });
  await db.$disconnect();
});

describe("about page content", () => {
  it("adds team members at the end, reorders, and shows only published ones", async () => {
    const a = await about.saveTeamMember(
      null,
      parse(teamMemberSchema, {
        status: "PUBLISHED",
        "translations.lo.name": "ທ. ທົດສອບ",
        "translations.lo.position": "ວິສະວະກອນ",
        "translations.en.name": "T. Test",
        "translations.en.position": "Engineer",
      }),
      ctx,
    );
    const b = await about.saveTeamMember(
      null,
      parse(teamMemberSchema, { status: "DRAFT", "translations.lo.name": "ຮ່າງ" }),
      ctx,
    );
    made.team.push(a.id, b.id);
    const order = async () =>
      (await db.teamMember.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true } })).map(
        (x) => x.id,
      );
    expect((await order()).slice(-2)).toEqual([a.id, b.id]);
    await about.moveAboutItem("team", b.id, "up", ctx);
    expect((await order()).slice(-2)).toEqual([b.id, a.id]);

    const publicTeam = (await getAboutData("en")).team.map((m) => m.name);
    expect(publicTeam).toContain("T. Test");
    expect(publicTeam).not.toContain("ຮ່າງ");
  });

  it("validates certification dates and milestone years", () => {
    const certIssue = certificationSchema.safeParse(
      formDataToObject(Object.assign(new FormData(), {})),
    );
    expect(certIssue.success).toBe(false);
    const fd = new FormData();
    for (const [k, v] of Object.entries({
      status: "PUBLISHED",
      issuedAt: "2026-05-01",
      expiresAt: "2025-01-01",
      "translations.lo.name": "ISO",
    }))
      fd.append(k, v);
    expect(
      certificationSchema
        .safeParse(formDataToObject(fd))
        .error?.issues.map((i) => [i.path.join("."), i.message]),
    ).toEqual([["expiresAt", "dateOrder"]]);
    const ms = new FormData();
    for (const [k, v] of Object.entries({
      status: "PUBLISHED",
      year: "18",
      "translations.lo.title": "x",
    }))
      ms.append(k, v);
    expect(milestoneSchema.safeParse(formDataToObject(ms)).error?.issues[0]?.path).toEqual([
      "year",
    ]);
  });

  it("updates, replaces translations and deletes", async () => {
    const { id } = await about.saveMilestone(
      null,
      parse(milestoneSchema, {
        year: "2030",
        status: "PUBLISHED",
        "translations.lo.title": "ອະນາຄົດ",
        "translations.en.title": "Future",
      }),
      ctx,
    );
    made.milestone.push(id);
    await about.saveMilestone(
      id,
      parse(milestoneSchema, {
        year: "2031",
        status: "PUBLISHED",
        "translations.lo.title": "ອະນາຄົດ 2",
      }),
      ctx,
    );
    const row = await db.milestone.findUniqueOrThrow({
      where: { id },
      include: { translations: true },
    });
    expect(row.year).toBe(2031);
    expect(row.translations.map((t) => t.locale)).toEqual(["lo"]);
    const cert = await about.saveCertification(
      null,
      parse(certificationSchema, { status: "PUBLISHED", "translations.lo.name": "ISO 9001" }),
      ctx,
    );
    await about.deleteAboutItem("certification", cert.id, ctx);
    expect(await db.certification.findUnique({ where: { id: cert.id } })).toBeNull();
    await expect(about.deleteAboutItem("certification", cert.id, ctx)).rejects.toMatchObject({
      code: "notFound",
    });
    const audit = (await db.auditLog.findMany({ where: { entityId: cert.id } }))
      .map((a) => a.action)
      .sort();
    expect(audit).toEqual(["CREATE", "DELETE"]);
  });
});
