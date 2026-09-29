import { afterEach, describe, expect, it, vi } from "vitest";

const env = { ...process.env };
afterEach(() => {
  process.env = { ...env };
  vi.resetModules();
});

describe("server environment errors", () => {
  it("say what is wrong and how to fix it, without echoing the value", async () => {
    process.env = { ...env, AUTH_SECRET: "tooShortSecretValue" };
    const { getServerEnv } = await import("@/lib/env/server");
    expect(() => getServerEnv()).toThrow(
      /AUTH_SECRET: must be at least 32 characters\. Generate one with: openssl rand -base64 32/,
    );
    expect(() => getServerEnv()).not.toThrow(/tooShortSecretValue/);
  });

  it("explain a missing secret", async () => {
    process.env = { ...env };
    delete process.env.AUTH_SECRET;
    const { getServerEnv } = await import("@/lib/env/server");
    expect(() => getServerEnv()).toThrow(/AUTH_SECRET: missing\. Generate one with/);
  });
});
