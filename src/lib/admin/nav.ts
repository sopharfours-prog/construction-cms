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
  /** Sub-menu entries (Website Settings sections). */
  children?: { key: string; label: string; href: string }[];
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
  /** Labels for sub-menu entries, by key; entries without one are left out. */
  childLabels: Partial<Record<string, string>> = {},
): VisibleNavGroup[] {
  return adminNav
    .map((group) => ({
      key: group.key,
      label: labels.groups[group.key],
      items: group.items
        .filter((item) => item.permission === null || permissions.has(item.permission))
        .map((item) => {
          const children = item.ready
            ? item.children?.flatMap((child) => {
                const label = childLabels[child.key];
                return label ? [{ key: child.key, label, href: child.href }] : [];
              })
            : undefined;
          return {
            key: item.key,
            label: labels.items[item.key],
            icon: item.icon,
            href: item.ready ? item.href : null,
            ...(children?.length ? { children } : {}),
          };
        }),
    }))
    .filter((group) => group.items.length > 0);
}

/** Longest-prefix match, so /admin/projects/1 highlights Projects, not Dashboard. */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
