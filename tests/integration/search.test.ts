import { afterAll, describe, expect, it } from "vitest";

const { db } = await import("@/lib/db/client");
const { searchSite } = await import("@/server/public/content");

const tag = `srch${Math.random().toString(36).slice(2, 8)}`;
const created: string[] = [];

async function project(slug: string, status: "PUBLISHED" | "DRAFT", deleted = false) {
  const p = await db.project.create({
    data: {
      slug: `${tag}-${slug}`,
      status,
      deletedAt: deleted ? new Date() : null,
      translations: {
        create: [
          { locale: "lo", title: `ໂຄງການ ${tag} ${slug}` },
          { locale: "en", title: `Project ${tag} ${slug}`, location: "Pakse" },
        ],
      },
    },
  });
  created.push(p.id);
}

afterAll(async () => {
  await db.project.deleteMany({ where: { id: { in: created } } });
  await db.$disconnect();
});

describe("site search", () => {
  it("finds only what is live on the website, in any language", async () => {
    await project("live", "PUBLISHED");
    await project("draft", "DRAFT");
    await project("gone", "PUBLISHED", true);

    const slugs = (await searchSite(tag, "en")).map((h) => h.slug);
    expect(slugs).toEqual([`${tag}-live`]);

    // Shown in the visitor's language, whichever language matched.
    const [lao] = await searchSite(tag, "lo");
    expect(lao).toMatchObject({ type: "project", title: `ໂຄງການ ${tag} live` });
    // A field only one language has (location) still finds it.
    expect((await searchSite(`${tag}`, "lo")).length).toBe(1);
  });

  it("treats the query as plain text and ignores blank queries", async () => {
    expect(await searchSite("   ", "en")).toEqual([]);
    await expect(searchSite("%_(", "en")).resolves.toBeInstanceOf(Array);
    expect((await searchSite(`${tag.toUpperCase()}`, "en")).length).toBe(1);
  });
});
