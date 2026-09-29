import { describe, expect, it } from "vitest";

import { readJsonInput } from "@/lib/api/json-input";
import { projectInputSchema } from "@/lib/validation/project";

const json = (body: string, type = "application/json") =>
  new Request("http://x/api", { method: "POST", body, headers: { "content-type": type } });

describe("REST API input", () => {
  it("maps JSON types onto the form schemas", async () => {
    const input = await readJsonInput(
      json(
        JSON.stringify({
          slug: "a",
          projectStatus: "ONGOING",
          status: "DRAFT",
          featured: true,
          showBudget: false,
          budget: 1500000,
          translations: { lo: { title: "T", specifications: [{ label: "Floors", value: 3 }] } },
        }),
      ),
    );
    const parsed = projectInputSchema.parse(input);
    expect(parsed).toMatchObject({ featured: true, showBudget: false, budget: "1500000" });
    expect(parsed.translations.lo?.specifications).toEqual([{ label: "Floors", value: "3" }]);
  });

  it("rejects non-JSON bodies and ignores prototype keys", async () => {
    await expect(readJsonInput(json("x", "text/plain"))).rejects.toMatchObject({
      code: "validation",
      reason: "jsonRequired",
    });
    await expect(readJsonInput(json("{not json"))).rejects.toMatchObject({ reason: "invalidJson" });
    const input = (await readJsonInput(
      json('{"__proto__":{"polluted":"yes"},"a":{"constructor":{"x":1}}}'),
    )) as Record<string, Record<string, unknown>>;
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.keys(input)).toEqual(["a"]);
    expect(Object.keys(input.a!)).toEqual([]);
  });

  it("missing translations is reported as a dictionary key", () => {
    const r = projectInputSchema.safeParse({
      slug: "a",
      projectStatus: "ONGOING",
      status: "DRAFT",
    });
    expect(Object.fromEntries(r.error!.issues.map((i) => [i.path.join("."), i.message]))).toEqual({
      translations: "required",
    });
  });
});
