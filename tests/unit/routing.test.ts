import { describe, expect, it } from "vitest";

import { localizedPath, pickLocale, switchLocalePath } from "@/i18n/routing";

describe("locale routing", () => {
  it("builds and switches localized paths", () => {
    expect(localizedPath("lo")).toBe("/lo");
    expect(localizedPath("en", "/projects/bridge")).toBe("/en/projects/bridge");
    expect(localizedPath("en", "projects")).toBe("/en/projects");
    expect(switchLocalePath("/lo/projects/bridge", "en")).toBe("/en/projects/bridge");
    expect(switchLocalePath("/en", "lo")).toBe("/lo");
    expect(switchLocalePath("/lo/", "en")).toBe("/en");
    expect(switchLocalePath("/", "en")).toBe("/en");
    expect(switchLocalePath("/projects", "en")).toBe("/en/projects");
  });

  it("picks the saved choice, then the browser language, then Lao", () => {
    expect(pickLocale("en", "lo-LA,lo;q=0.9")).toBe("en");
    expect(pickLocale("fr", null)).toBe("lo");
    expect(pickLocale(undefined, "en-US,en;q=0.9,lo;q=0.8")).toBe("en");
    expect(pickLocale(undefined, "th-TH,th;q=0.9,lo;q=0.95,en;q=0.5")).toBe("lo");
    expect(pickLocale(undefined, "fr-FR,de;q=0.8")).toBe("lo");
    expect(pickLocale(undefined, "en;q=0,lo;q=0.1")).toBe("lo");
    expect(pickLocale(undefined, "garbage;;q=abc,,")).toBe("lo");
  });
});
