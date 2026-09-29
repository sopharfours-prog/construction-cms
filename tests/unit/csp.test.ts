import { describe, expect, it } from "vitest";

import { adminCsp, createNonce, publicSiteCsp, storageOriginFromEnv } from "@/lib/security/csp";

const directives = (csp: string) =>
  Object.fromEntries(
    csp.split("; ").map((d) => {
      const [name, ...values] = d.split(" ");
      return [name!, values];
    }),
  );

describe("content security policy", () => {
  it("admin: nonce + strict-dynamic, no inline scripts, nothing framed", () => {
    const d = directives(adminCsp("abc123==", { storageOrigin: "https://files.example.com" }));
    expect(d["script-src"]).toEqual(["'self'", "'nonce-abc123=='", "'strict-dynamic'"]);
    expect(d["script-src"]).not.toContain("'unsafe-inline'");
    expect(d["frame-src"]).toEqual(["'none'"]);
    expect(d["frame-ancestors"]).toEqual(["'none'"]);
    expect(d["object-src"]).toEqual(["'none'"]);
    expect(d["img-src"]).toContain("https://files.example.com");
    expect(d).toHaveProperty("upgrade-insecure-requests");
  });

  it("public site: locked down apart from inline scripts; only Google Maps can be framed", () => {
    const d = directives(publicSiteCsp({}));
    expect(d["script-src"]).toEqual([
      "'self'",
      "'unsafe-inline'",
      "https://www.googletagmanager.com",
    ]);
    expect(d["frame-src"]).toEqual(["https://www.google.com"]);
    expect(d["form-action"]).toEqual(["'self'"]);
    expect(d["base-uri"]).toEqual(["'self'"]);
    expect(d["object-src"]).toEqual(["'none'"]);
  });

  it("dev adds only what React refresh needs", () => {
    expect(adminCsp("n", { isDev: true })).toContain("'unsafe-eval'");
    expect(adminCsp("n", {})).not.toContain("'unsafe-eval'");
    expect(publicSiteCsp({ isDev: true })).not.toContain("upgrade-insecure-requests");
  });

  it("derives the storage origin only for S3 with a valid public URL", () => {
    expect(
      storageOriginFromEnv({
        STORAGE_DRIVER: "s3",
        S3_PUBLIC_URL: "https://cdn.example.com/bucket/x",
      }),
    ).toBe("https://cdn.example.com");
    expect(
      storageOriginFromEnv({ STORAGE_DRIVER: "local", S3_PUBLIC_URL: "https://cdn.example.com" }),
    ).toBeNull();
    expect(storageOriginFromEnv({ STORAGE_DRIVER: "s3", S3_PUBLIC_URL: "not a url" })).toBeNull();
  });

  it("nonces are random and unguessable", () => {
    const set = new Set(Array.from({ length: 200 }, createNonce));
    expect(set.size).toBe(200);
    expect(createNonce()).toMatch(/^[A-Za-z0-9+/]{22}==$/);
  });
});
