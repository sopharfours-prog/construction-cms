import { describe, expect, it } from "vitest";

import { checkFormToken, createFormToken } from "@/lib/security/form-token";
import { inquiryInputSchema, quoteInputSchema } from "@/lib/validation/requests";

const secret = "test-secret-with-enough-entropy-1234567890";

describe("form token", () => {
  const now = 1_790_000_000_000;
  it("accepts a human-paced submission", () => {
    expect(checkFormToken(createFormToken(secret, now - 10_000), secret, now)).toBe("ok");
  });
  it("rejects bots and forgeries", () => {
    expect(checkFormToken(createFormToken(secret, now - 500), secret, now)).toBe("tooFast");
    expect(checkFormToken(createFormToken(secret, now - 25 * 3600_000), secret, now)).toBe(
      "expired",
    );
    expect(checkFormToken(createFormToken("other-secret", now - 10_000), secret, now)).toBe(
      "invalid",
    );
    const [issued, sig] = createFormToken(secret, now - 10_000).split(".");
    expect(checkFormToken(`${Number(issued) - 60_000}.${sig}`, secret, now)).toBe("invalid"); // time changed, signature not
    for (const junk of [undefined, "", "abc", "1.2.3", 42, "x".repeat(500)])
      expect(checkFormToken(junk, secret, now)).toBe("invalid");
  });
});

describe("public form schemas", () => {
  it("normalises and validates contact messages", () => {
    const parsed = inquiryInputSchema.parse({
      name: " ສົມພອນ ",
      email: " Customer@Example.COM ",
      phone: "",
      subject: "Hi",
      message: "Please call me back about a house.",
    });
    expect(parsed).toMatchObject({
      name: "ສົມພອນ",
      email: "customer@example.com",
      phone: undefined,
      company: null,
    });
    const bad = inquiryInputSchema.safeParse({
      name: "",
      email: "x@",
      phone: "call me",
      subject: "s",
      message: "short",
    });
    expect(Object.fromEntries(bad.error!.issues.map((i) => [i.path.join("."), i.message]))).toEqual(
      {
        name: "required",
        email: "emailInvalid",
        phone: "phoneInvalid",
        message: "tooShort",
      },
    );
  });

  it("requires phone and details for quotes and parses amounts", () => {
    const raw = {
      customerName: "A",
      email: "a@example.com",
      phone: "+856 20 5555 1234",
      projectType: "House",
      location: "Vientiane",
      estimatedBudget: "1,500,000,000",
      currency: "LAK",
      expectedStartDate: "2027-02-01",
      description: "Two-storey house with a garage and garden.",
    };
    const parsed = quoteInputSchema.parse(raw);
    expect(parsed.estimatedBudget).toBe("1500000000");
    expect(parsed.expectedStartDate?.toISOString()).toBe("2027-02-01T00:00:00.000Z");
    expect(
      quoteInputSchema.safeParse({ ...raw, phone: "" }).error?.issues.map((i) => i.path.join(".")),
    ).toEqual(["phone"]);
    expect(
      quoteInputSchema.safeParse({ ...raw, estimatedBudget: "", expectedStartDate: "" }).success,
    ).toBe(true);
  });
});
