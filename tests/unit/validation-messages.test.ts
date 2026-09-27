import { describe, expect, it } from "vitest";

import { formDataToObject } from "@/lib/content/form-data";
import { getAdminMessages } from "@/i18n/admin";
import { newsInputSchema } from "@/lib/validation/news";
import { projectInputSchema } from "@/lib/validation/project";

const keys = new Set(Object.keys(getAdminMessages("en").validation));
const messages = (
  schema: {
    safeParse: (v: unknown) => { error?: { issues: { path: PropertyKey[]; message: string }[] } };
  },
  fields: Record<string, string>,
) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return Object.fromEntries(
    (schema.safeParse(formDataToObject(fd)).error?.issues ?? []).map((i) => [
      i.path.join("."),
      i.message,
    ]),
  );
};

describe("validation messages are dictionary keys", () => {
  it("project form", () => {
    const m = messages(projectInputSchema, {
      slug: "Bad Slug",
      projectStatus: "ONGOING",
      status: "DRAFT",
      startDate: "2026-05-01",
      completionDate: "2026-01-01",
      budget: "12abc",
      "translations.en.location": "x",
    });
    expect(m).toMatchObject({
      slug: "slugInvalid",
      budget: "amountInvalid",
      "translations.lo.title": "required",
      "translations.en.title": "required",
    });
    for (const message of Object.values(m)) expect(keys.has(message), message).toBe(true);
  });

  it("date order and scheduling", () => {
    expect(
      messages(projectInputSchema, {
        slug: "a",
        projectStatus: "ONGOING",
        status: "DRAFT",
        startDate: "2026-05-01",
        completionDate: "2026-01-01",
        "translations.lo.title": "T",
      }),
    ).toEqual({
      completionDate: "dateOrder",
    });
    expect(
      messages(newsInputSchema, { slug: "a", status: "SCHEDULED", "translations.lo.title": "T" }),
    ).toEqual({ publishedAt: "scheduleNeedsDate" });
    expect(
      messages(newsInputSchema, {
        slug: "a",
        status: "SCHEDULED",
        publishedAt: "2020-02-30T10:00",
        "translations.lo.title": "T",
      }),
    ).toEqual({
      publishedAt: "dateInvalid",
    });
  });
});
