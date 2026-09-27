import { describe, expect, it } from "vitest";

import { defaultRoles, SUPER_ADMIN_ROLE_KEY } from "@/lib/permissions/default-roles";
import { allPermissions, isPermissionKey } from "@/lib/permissions/registry";

const role = (key: string) => {
  const found = defaultRoles.find((r) => r.key === key);
  if (!found || found.permissions === "all") throw new Error(`role ${key} not found`);
  return new Set(found.permissions);
};

describe("permission registry", () => {
  it("has unique keys in group.action form", () => {
    const keys = allPermissions.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(key).toMatch(/^[a-z]+\.[a-z]+$/);
  });

  it("recognises only registered keys", () => {
    expect(isPermissionKey("projects.update")).toBe(true);
    expect(isPermissionKey("projects.destroy")).toBe(false);
  });
});

describe("default roles", () => {
  it("reference only registered permissions", () => {
    for (const r of defaultRoles) {
      if (r.permissions === "all") continue;
      for (const key of r.permissions) expect(isPermissionKey(key), `${r.key}: ${key}`).toBe(true);
    }
  });

  it("gives Super Administrator every permission", () => {
    expect(defaultRoles.find((r) => r.key === SUPER_ADMIN_ROLE_KEY)?.permissions).toBe("all");
  });

  it("keeps Viewer read-only and out of audit logs", () => {
    const viewer = role("VIEWER");
    for (const key of viewer) expect(key.endsWith(".view")).toBe(true);
    expect(viewer.has("audit.view")).toBe(false);
  });

  it("keeps user, role and audit management away from Administrator", () => {
    const admin = role("ADMIN");
    for (const key of [
      "users.create",
      "users.update",
      "users.delete",
      "roles.manage",
      "audit.view",
      "settings.update",
    ] as const) {
      expect(admin.has(key), key).toBe(false);
    }
  });

  it("limits editors to their own areas", () => {
    const content = role("CONTENT_EDITOR");
    expect(content.has("news.update")).toBe(true);
    expect(content.has("projects.update")).toBe(false);
    const project = role("PROJECT_EDITOR");
    expect(project.has("projects.update")).toBe(true);
    expect(project.has("news.update")).toBe(false);
    expect(project.has("media.delete")).toBe(false);
  });
});
