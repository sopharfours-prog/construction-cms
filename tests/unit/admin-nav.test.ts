import { describe, expect, it } from "vitest";

import { adminNav } from "@/config/admin-nav";
import { getAdminMessages } from "@/i18n/admin";
import { getVisibleNav, isNavItemActive } from "@/lib/admin/nav";
import { defaultRoles } from "@/lib/permissions/default-roles";
import { allPermissions, isPermissionKey, type PermissionKey } from "@/lib/permissions/registry";

const labels = getAdminMessages("en").nav;
const permsOf = (roleKey: string): Set<PermissionKey> => {
  const role = defaultRoles.find((r) => r.key === roleKey)!;
  return new Set(role.permissions === "all" ? allPermissions.map((p) => p.key) : role.permissions);
};
const keys = (roleKey: string) =>
  getVisibleNav(permsOf(roleKey), labels).flatMap((g) => g.items.map((i) => i.key));

describe("admin navigation", () => {
  it("only references registered permissions", () => {
    for (const item of adminNav.flatMap((g) => g.items))
      expect(isPermissionKey(item.permission)).toBe(true);
  });

  it("shows everything to a Super Administrator", () => {
    expect(keys("SUPER_ADMIN")).toHaveLength(adminNav.flatMap((g) => g.items).length);
  });

  it("hides users, audit logs and nothing else extra from Administrator", () => {
    const visible = keys("ADMIN");
    expect(visible).not.toContain("users");
    expect(visible).not.toContain("auditLogs");
    expect(visible).toContain("quotes");
    expect(visible).toContain("settings");
  });

  it("limits Project Editor to its areas and drops empty groups", () => {
    const nav = getVisibleNav(permsOf("PROJECT_EDITOR"), labels);
    expect(nav.flatMap((g) => g.items.map((i) => i.key))).toEqual([
      "dashboard",
      "projects",
      "services",
      "media",
    ]);
    expect(nav.map((g) => g.key)).not.toContain("customers");
    expect(nav.map((g) => g.key)).not.toContain("system");
  });

  it("never lets Viewer see audit logs", () => {
    expect(keys("VIEWER")).not.toContain("auditLogs");
  });

  it("returns nothing for a user without permissions", () => {
    expect(getVisibleNav(new Set(), labels)).toEqual([]);
  });

  it("does not link sections that are not built yet", () => {
    const items = getVisibleNav(permsOf("SUPER_ADMIN"), labels).flatMap((g) => g.items);
    for (const def of adminNav.flatMap((g) => g.items)) {
      const item = items.find((i) => i.key === def.key)!;
      expect(item.href).toBe(def.ready ? def.href : null);
    }
  });

  it("matches the active item by path segment", () => {
    expect(isNavItemActive("/admin", "/admin")).toBe(true);
    expect(isNavItemActive("/admin", "/admin/audit-logs")).toBe(false);
    expect(isNavItemActive("/admin/audit-logs", "/admin/audit-logs")).toBe(true);
    expect(isNavItemActive("/admin/projects", "/admin/projects/123/edit")).toBe(true);
    expect(isNavItemActive("/admin/projects", "/admin/projects-archive")).toBe(false);
  });
});

describe("admin dictionaries", () => {
  it("Lao and English have exactly the same keys", () => {
    const shape = (value: unknown): unknown =>
      value && typeof value === "object"
        ? Object.fromEntries(
            Object.entries(value)
              .map(([k, v]) => [k, shape(v)])
              .sort(),
          )
        : typeof value;
    expect(shape(getAdminMessages("lo"))).toEqual(shape(getAdminMessages("en")));
  });
});
