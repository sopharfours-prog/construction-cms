import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { CurrentUser } from "@/lib/auth/session";
import { allPermissions, type PermissionKey } from "@/lib/permissions/registry";

const { db } = await import("@/lib/db/client");
const { formDataToObject } = await import("@/lib/content/form-data");
const { serviceInputSchema } = await import("@/lib/validation/service");
const { newsInputSchema } = await import("@/lib/validation/news");
const { pageInputSchema } = await import("@/lib/validation/page");
const { taxonomyInputSchema } = await import("@/lib/validation/taxonomy");
const services = await import("@/server/services/services");
const news = await import("@/server/services/news");
const pages = await import("@/server/services/pages");
const taxonomy = await import("@/server/services/taxonomy");

const tag = randomUUID().slice(0, 6);
let actorId: string;
const cleanup: (() => Promise<unknown>)[] = [];

function ctx(permissions: PermissionKey[] = allPermissions.map((p) => p.key)) {
  const user: CurrentUser = {
    id: actorId,
    name: "IT",
    email: "it@example.com",
    avatarUrl: null,
    preferredLocale: null,
    role: { key: "T", name: "T" },
    permissions: new Set(permissions),
  };
  return { user, request: { ipAddress: null, userAgent: "vitest" } };
}
function parse<T>(schema: { parse: (v: unknown) => T }, fields: Record<string, string | string[]>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const x of [v].flat()) fd.append(k, x);
  return schema.parse(formDataToObject(fd));
}

beforeAll(async () => {
  actorId = (await db.user.findFirstOrThrow({ where: { email: "admin@example.com" } })).id;
});
afterAll(async () => {
  for (const fn of cleanup.reverse()) await fn();
  await db.$disconnect();
});

describe("services", () => {
  it("creates at the end of the order and reorders densely", async () => {
    const a = await services.createService(
      parse(serviceInputSchema, {
        slug: `svc-a-${tag}`,
        icon: "truck",
        status: "DRAFT",
        "translations.lo.title": "A",
      }),
      ctx(),
    );
    const b = await services.createService(
      parse(serviceInputSchema, {
        slug: `svc-b-${tag}`,
        icon: "zap",
        status: "DRAFT",
        "translations.lo.title": "B",
      }),
      ctx(),
    );
    cleanup.push(() => db.service.deleteMany({ where: { id: { in: [a.id, b.id] } } }));

    const order = async () =>
      (
        await db.service.findMany({
          where: { deletedAt: null },
          orderBy: { sortOrder: "asc" },
          select: { id: true },
        })
      ).map((s) => s.id);
    expect((await order()).slice(-2)).toEqual([a.id, b.id]);
    await services.moveService(b.id, "up", ctx());
    expect((await order()).slice(-2)).toEqual([b.id, a.id]);
    const orders = (
      await db.service.findMany({ where: { deletedAt: null }, select: { sortOrder: true } })
    )
      .map((s) => s.sortOrder)
      .sort((x, y) => x - y);
    expect(orders).toEqual(orders.map((_, i) => i));
  });

  it("rejects icons outside the allow-list", () => {
    expect(
      serviceInputSchema.safeParse(formDataToObject(Object.assign(new FormData()))),
    ).toMatchObject({ success: false });
    const fd = new FormData();
    fd.append("slug", "x");
    fd.append("icon", "<script>");
    fd.append("status", "DRAFT");
    fd.append("translations.lo.title", "T");
    expect(serviceInputSchema.safeParse(formDataToObject(fd)).error?.issues[0]?.path).toEqual([
      "icon",
    ]);
  });
});

describe("news", () => {
  it("requires a future time for scheduled articles", () => {
    const base = { slug: "n", status: "SCHEDULED", "translations.lo.title": "T" };
    expect(
      newsInputSchema.safeParse(formDataToObject(Object.assign(new FormData(), {}))).success,
    ).toBe(false);
    const noDate = new FormData();
    Object.entries(base).forEach(([k, v]) => noDate.append(k, v));
    expect(newsInputSchema.safeParse(formDataToObject(noDate)).error?.issues[0]?.message).toBe(
      "scheduleNeedsDate",
    );
    noDate.append("publishedAt", "2020-01-01T10:00");
    expect(newsInputSchema.safeParse(formDataToObject(noDate)).error?.issues[0]?.message).toBe(
      "scheduleInPast",
    );
  });

  it("schedules in Vientiane time and needs news.publish to change status", async () => {
    const future = new Date(Date.now() + 3 * 86_400_000);
    const local = new Date(future.getTime() + 7 * 3600_000).toISOString().slice(0, 16);
    const input = parse(newsInputSchema, {
      slug: `news-${tag}`,
      status: "SCHEDULED",
      publishedAt: local,
      "translations.lo.title": "ຂ່າວ",
    });
    await expect(news.createNews(input, ctx(["news.create"]))).rejects.toMatchObject({
      messageKey: "publishNotAllowed",
    });

    const { id } = await news.createNews(input, ctx());
    cleanup.push(() => db.news.deleteMany({ where: { id } }));
    const stored = await db.news.findUniqueOrThrow({ where: { id } });
    expect(stored.status).toBe("SCHEDULED");
    expect(Math.abs(stored.publishedAt!.getTime() - future.getTime())).toBeLessThan(60_000);

    await news.setNewsStatus(id, "ARCHIVED", ctx());
    expect((await db.news.findUniqueOrThrow({ where: { id } })).status).toBe("ARCHIVED");
  });
});

describe("pages", () => {
  it("protects pages the website links to", async () => {
    const about = await db.page.findUniqueOrThrow({ where: { slug: "about" } });
    await expect(pages.deletePage(about.id, ctx())).rejects.toMatchObject({
      messageKey: "systemPage",
    });
    const rename = parse(pageInputSchema, {
      slug: "about-us",
      status: "PUBLISHED",
      "translations.lo.title": "X",
    });
    await expect(pages.updatePage(about.id, rename, ctx())).rejects.toMatchObject({
      field: "slug",
      messageKey: "systemPage",
    });
  });
});

describe("taxonomy", () => {
  it("rejects duplicates per type and detaches content on delete", async () => {
    const input = parse(taxonomyInputSchema, {
      kind: "category",
      type: "PROJECT",
      slug: `cat-${tag}`,
      "names.lo": "ໝວດ",
    });
    const { id } = await taxonomy.saveTaxonomy(null, input, ctx());
    await expect(taxonomy.saveTaxonomy(null, input, ctx())).rejects.toMatchObject({
      code: "conflict",
    });
    // Same slug is fine for the other category type.
    const other = await taxonomy.saveTaxonomy(
      null,
      parse(taxonomyInputSchema, {
        kind: "category",
        type: "NEWS",
        slug: `cat-${tag}`,
        "names.lo": "ໝວດ",
      }),
      ctx(),
    );
    cleanup.push(() => db.category.deleteMany({ where: { id: other.id } }));

    const project = await db.project.findFirstOrThrow({ where: { deletedAt: null } });
    const previous = project.categoryId;
    await db.project.update({ where: { id: project.id }, data: { categoryId: id } });
    await taxonomy.deleteTaxonomy("category", id, ctx());
    const after = await db.project.findUniqueOrThrow({ where: { id: project.id } });
    expect(after.categoryId).toBeNull();
    expect(after.deletedAt).toBeNull();
    await db.project.update({ where: { id: project.id }, data: { categoryId: previous } });
  });
});
