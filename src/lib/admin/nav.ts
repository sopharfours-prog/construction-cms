import {
  adminNav,
  type AdminNavGroupKey,
  type AdminNavIcon,
  type AdminNavItemKey,
} from "@/config/admin-nav";
import type { PermissionKey } from "@/lib/permissions/registry";

export type VisibleNavItem = {
  key: AdminNavItemKey;
  label: string;
  icon: AdminNavIcon;
  /** Null for sections not built yet: rendered disabled, never as a link. */
  href: string | null;
};

export type VisibleNavGroup = { key: AdminNavGroupKey; label: string; items: VisibleNavItem[] };

/**
 * Navigation for one user: items they lack permission for are removed, and
 * groups left empty are dropped. Hiding links is only a convenience; every
 * page and action still checks the permission on the server.
 */
export function getVisibleNav(
  permissions: ReadonlySet<PermissionKey>,
  labels: { groups: Record<AdminNavGroupKey, string>; items: Record<AdminNavItemKey, string> },
): VisibleNavGroup[] {
  return adminNav
    .map((group) => ({
      key: group.key,
      label: labels.groups[group.key],
      items: group.items
        .filter((item) => permissions.has(item.permission))
        .map((item) => ({
          key: item.key,
          label: labels.items[item.key],
          icon: item.icon,
          href: item.ready ? item.href : null,
        })),
    }))
    .filter((group) => group.items.length > 0);
}

/** Longest-prefix match, so /admin/projects/1 highlights Projects, not Dashboard. */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
