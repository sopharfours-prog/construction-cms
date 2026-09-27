import { describe, expect, it } from "vitest";

import { redactSecrets } from "@/lib/security/redact";

describe("redactSecrets", () => {
  it("redacts sensitive keys at any depth and keeps the rest", () => {
    const input = {
      email: "a@example.com",
      passwordHash: "$argon2id$...",
      profile: { name: "Noy", resetToken: "abc", nested: [{ apiKey: "k", ok: 1 }] },
      createdAt: new Date("2026-01-01T00:00:00Z"),
    };
    expect(redactSecrets(input)).toEqual({
      email: "a@example.com",
      passwordHash: "[REDACTED]",
      profile: { name: "Noy", resetToken: "[REDACTED]", nested: [{ apiKey: "[REDACTED]", ok: 1 }] },
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("does not mutate the input", () => {
    const input = { password: "secret" };
    redactSecrets(input);
    expect(input.password).toBe("secret");
  });
});
