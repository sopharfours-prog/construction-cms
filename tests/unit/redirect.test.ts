import { describe, expect, it } from "vitest";

import { safeAdminCallbackUrl } from "@/lib/security/redirect";

describe("safeAdminCallbackUrl", () => {
  it.each([
    ["/admin", "/admin"],
    ["/admin/projects", "/admin/projects"],
    ["/admin/projects?page=2&q=bridge", "/admin/projects?page=2&q=bridge"],
  ])("keeps admin path %s", (input, expected) => {
    expect(safeAdminCallbackUrl(input)).toBe(expected);
  });

  it.each([
    ["absolute URL", "https://evil.example/admin"],
    ["protocol-relative", "//evil.example/admin"],
    ["backslash trick", "/\\evil.example"],
    ["encoded control char", "/admin\u0009/x"],
    ["javascript scheme", "javascript:alert(1)"],
    ["public page", "/projects"],
    ["prefix lookalike", "/administrator"],
    ["dot-segment escape", "/admin/../projects"],
    ["login loop", "/admin/login"],
    ["reset page", "/admin/reset-password?token=x"],
    ["empty", ""],
    ["non-string", 42],
    ["undefined", undefined],
    ["array (repeated query param)", ["/admin/a", "/admin/b"]],
  ])("rejects %s", (_label, input) => {
    expect(safeAdminCallbackUrl(input)).toBe("/admin");
  });
});
