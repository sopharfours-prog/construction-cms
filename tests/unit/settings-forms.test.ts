import { describe, expect, it } from "vitest";

import { contrastRatio } from "@/lib/theme/contrast";
import { formDataToObject } from "@/lib/content/form-data";
import { settingsSchemas } from "@/lib/validation/settings";
import { settingsFormSchemas } from "@/lib/validation/settings-forms";

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return formDataToObject(fd);
};

describe("settings form schemas", () => {
  it("turns the contact form into the stored shape", () => {
    const value = settingsFormSchemas.contact.parse(
      form({
        "address.lo": "ນະຄອນຫຼວງວຽງຈັນ",
        email: " Info@Example.LA ",
        phones: "+856 21 123 456\r\n\n  020 5555 1234 ",
        notificationEmail: "",
        mapEmbedUrl: "",
      }),
    );
    expect(value).toMatchObject({
      phones: ["+856 21 123 456", "020 5555 1234"],
      email: "info@example.la",
      notificationEmail: null,
      mapEmbedUrl: null,
      address: { lo: "ນະຄອນຫຼວງວຽງຈັນ", en: "" },
    });
    // What the form produces is accepted by the stored schema.
    expect(settingsSchemas.contact.safeParse(value).success).toBe(true);
  });

  it("rejects unsafe or malformed values with dictionary keys", () => {
    const messages = (key: keyof typeof settingsFormSchemas, fields: Record<string, string>) =>
      Object.fromEntries(
        (settingsFormSchemas[key].safeParse(form(fields)).error?.issues ?? []).map((i) => [
          i.path.join("."),
          i.message,
        ]),
      );
    expect(
      messages("contact", { email: "x@y.la", mapEmbedUrl: "https://evil.example/embed" }),
    ).toEqual({ mapEmbedUrl: "mapUrlInvalid" });
    expect(messages("contact", { email: "x@y.la", phones: "call me" })).toEqual({
      "phones.0": "phoneInvalid",
    });
    expect(
      messages("social", { facebook: "javascript:alert(1)", youtube: "http://youtube.com/x" }),
    ).toEqual({ facebook: "urlInvalid", youtube: "urlInvalid" });
    expect(messages("seo", { googleAnalyticsId: "UA-123" })).toEqual({
      googleAnalyticsId: "gaInvalid",
    });
    expect(
      messages("appearance", {
        "brand.primary": "red",
        "brand.primaryForeground": "#fff",
        "brand.accent": "#c99a2e",
        "brand.accentForeground": "#000000",
        defaultTheme: "light",
      }),
    ).toEqual({
      "brand.primary": "colorInvalid",
      "brand.primaryForeground": "colorInvalid",
    });
    expect(messages("general", { "siteName.en": "Only English" })).toEqual({
      "siteName.lo": "required",
    });
    expect(messages("statistics", { clients: "-5", teamMembers: "12abc" })).toEqual({
      clients: "invalid",
      teamMembers: "invalid",
    });
  });

  it("GA ids are normalised and statistics accept empty fields", () => {
    expect(
      settingsFormSchemas.seo.parse(form({ googleAnalyticsId: "g-abc123" })).googleAnalyticsId,
    ).toBe("G-ABC123");
    expect(
      settingsFormSchemas.statistics.parse(form({ yearsOfExperience: "18", clients: "" })),
    ).toEqual({ yearsOfExperience: 18, clients: null, teamMembers: null });
  });
});

describe("contrast ratio (WCAG)", () => {
  it("matches reference values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 1); // famous just-below-AA grey
    expect(contrastRatio("#14325a", "#ffffff")).toBeGreaterThan(4.5);
  });
});
