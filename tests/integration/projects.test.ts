import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import type { CurrentUser } from "@/lib/auth/session";
import { allPermissions, type PermissionKey } from "@/lib/permissions/registry";

const { db } = await import("@/lib/db/client");
const { projectInputSchema } = await import("@/lib/validation/project");
const { createProject, updateProject, deleteProject, setProjectPublished, listProjects } =
  await import("@/server/services/projects");
const { formDataToObject } = await import("@/lib/content/form-data");

const created: string[] = [];
const slug = `it-${randomUUID().slice(0, 8)}`;
let actorId: string;

function ctx(permissions: PermissionKey[] = allPermissions.map((p) => p.key)) {
  const user: CurrentUser = {
    id: actorId,
    name: "IT",
    email: "it@example.com",
    avatarUrl: null,
    preferredLocale: null,
    role: { key: "TEST", name: "Test" },
    permissions: new Set(permissions),
  };
  return { user, request: { ipAddress: "192.0.2.9", userAgent: "vitest" } };
}

function form(fields: Record<string, string | string[]>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const x of [v].flat()) fd.append(k, x);
  return projectInputSchema.parse(formDataToObject(fd));
}

const doc = JSON.stringify({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "Body" }] }],
});

afterAll(async () => {
  await db.project.deleteMany({ where: { id: { in: created } } });
  await db.$disconnect();
});

describe("projects service", () => {
  it("validates translations: default language title required", () => {
    const r = projectInputSchema.safeParse(formDataToObject(Object.assign(new FormData(), {})));
    expect(r.success).toBe(false);
    const fd = new FormData();
    fd.append("slug", "x");
    fd.append("projectStatus", "ONGOING");
    fd.append("status", "DRAFT");
    fd.append("translations.en.location", "Somewhere");
    const issues = projectInputSchema
      .safeParse(formDataToObject(fd))
      .error!.issues.map((i) => i.path.join("."));
    expect(issues).toContain("translations.lo.title");
    expect(issues).toContain("translations.en.title");
  });

  it("strips unsafe rich text before it reaches the database", () => {
    const evil = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "x",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        },
        { type: "iframe", attrs: { src: "https://evil" } },
      ],
    });
    const input = form({
      slug: "s",
      projectStatus: "ONGOING",
      status: "DRAFT",
      "translations.lo.title": "T",
      "translations.lo.description": evil,
    });
    expect(input.translations.lo?.description).toEqual({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "x" }] }],
    });
  });

  it("creates, lists, updates and audits a project", async () => {
    actorId = (await db.user.findFirstOrThrow({ where: { email: "admin@example.com" } })).id;
    const { id } = await createProject(
      form({
        slug,
        projectStatus: "ONGOING",
        status: "DRAFT",
        startDate: "2026-01-01",
        budget: "1,250,000.50",
        "translations.lo.title": "ໂຄງການທົດສອບ",
        "translations.lo.description": doc,
        "translations.en.title": "Integration project",
        "translations.lo.specifications.0.label": "Floors",
        "translations.lo.specifications.0.value": "3",
      }),
      ctx(),
    );
    created.push(id);

    const stored = await db.project.findUniqueOrThrow({
      where: { id },
      include: { translations: true },
    });
    expect(stored.budget?.toString()).toBe("1250000.5");
    expect(stored.translations).toHaveLength(2);

    const list = await listProjects({ page: 1, q: "Integration", sort: "updated" } as never, "en");
    expect(list.rows.map((r) => r.id)).toContain(id);

    // Drop English, clear the Lao description.
    await updateProject(
      id,
      form({
        slug,
        projectStatus: "COMPLETED",
        status: "DRAFT",
        "translations.lo.title": "ໂຄງການທົດສອບ",
      }),
      ctx(),
    );
    const after = await db.project.findUniqueOrThrow({
      where: { id },
      include: { translations: true },
    });
    expect(after.translations.map((t) => t.locale)).toEqual(["lo"]);
    expect(after.translations[0]!.description).toBeNull();
    expect(after.translations[0]!.specifications).toBeNull();

    const audit = await db.auditLog.findMany({
      where: { entityId: id },
      orderBy: { createdAt: "asc" },
    });
    expect(audit.map((a) => a.action)).toEqual(["CREATE", "UPDATE"]);
    expect(audit[0]!.ipAddress).toBe("192.0.2.9");
  });

  it("rejects a duplicate slug", async () => {
    await expect(
      createProject(
        form({ slug, projectStatus: "ONGOING", status: "DRAFT", "translations.lo.title": "Dup" }),
        ctx(),
      ),
    ).rejects.toMatchObject({ code: "conflict", field: "slug" });
  });

  it("refuses publishing without projects.publish", async () => {
    const id = created[0]!;
    const noPublish = ctx(["projects.view", "projects.update"]);
    await expect(
      updateProject(
        id,
        form({ slug, projectStatus: "ONGOING", status: "PUBLISHED", "translations.lo.title": "T" }),
        noPublish,
      ),
    ).rejects.toMatchObject({ field: "status", messageKey: "publishNotAllowed" });
  });

  it("publishes, then soft-deletes and frees the slug", async () => {
    const id = created[0]!;
    await setProjectPublished(id, true, ctx());
    expect((await db.project.findUniqueOrThrow({ where: { id } })).publishedAt).not.toBeNull();

    await deleteProject(id, ctx());
    const gone = await db.project.findUniqueOrThrow({ where: { id } });
    expect(gone.deletedAt).not.toBeNull();
    expect(gone.slug).not.toBe(slug);
    expect(gone.status).toBe("DRAFT");

    const again = await createProject(
      form({ slug, projectStatus: "UPCOMING", status: "DRAFT", "translations.lo.title": "Reuse" }),
      ctx(),
    );
    created.push(again.id);
    await expect(deleteProject(id, ctx())).rejects.toMatchObject({ code: "notFound" });
  });
});
