import { describe, expect, it } from "vitest";

import { getRequestInfo } from "@/lib/security/request-info";
import { generateToken, sha256 } from "@/lib/security/tokens";
import { loginSchema, resetPasswordSchema } from "@/lib/validation/auth";

describe("loginSchema", () => {
  it("normalises email to trimmed lower case", () => {
    const r = loginSchema.parse({ email: "  Admin@Example.COM ", password: "x" });
    expect(r.email).toBe("admin@example.com");
    expect(r.remember).toBe(false);
  });

  it("returns message keys, not text", () => {
    const r = loginSchema.safeParse({ email: "nope", password: "" });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.message).sort()).toEqual([
      "emailInvalid",
      "passwordRequired",
    ]);
  });

  it("bounds password length (hashing cost)", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x".repeat(129) }).success).toBe(
      false,
    );
  });
});

describe("resetPasswordSchema", () => {
  const token = generateToken();

  it("accepts a valid reset", () => {
    expect(
      resetPasswordSchema.safeParse({
        token,
        password: "a".repeat(12),
        confirmPassword: "a".repeat(12),
      }).success,
    ).toBe(true);
  });

  it("rejects short and mismatched passwords", () => {
    const short = resetPasswordSchema.safeParse({
      token,
      password: "short",
      confirmPassword: "short",
    });
    expect(short.error?.issues[0]?.message).toBe("passwordTooShort");
    const mismatch = resetPasswordSchema.safeParse({
      token,
      password: "a".repeat(12),
      confirmPassword: "b".repeat(12),
    });
    expect(mismatch.error?.issues[0]?.message).toBe("passwordMismatch");
  });

  it("rejects malformed tokens", () => {
    expect(
      resetPasswordSchema.safeParse({
        token: "abc",
        password: "a".repeat(12),
        confirmPassword: "a".repeat(12),
      }).success,
    ).toBe(false);
  });
});

describe("tokens", () => {
  it("generates unique 43-char URL-safe tokens and stable hashes", () => {
    const a = generateToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateToken()).not.toBe(a);
    expect(sha256(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256(a)).toBe(sha256(a));
  });
});

describe("getRequestInfo", () => {
  it("takes the left-most forwarded IP and ignores garbage", () => {
    expect(
      getRequestInfo(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })).ipAddress,
    ).toBe("203.0.113.7");
    expect(getRequestInfo(new Headers({ "x-forwarded-for": "<script>" })).ipAddress).toBeNull();
    expect(getRequestInfo(new Headers({ "user-agent": "x".repeat(900) })).userAgent).toHaveLength(
      512,
    );
  });
});
