import type { PermissionKey } from "@/lib/permissions/registry";

/** Pure permission check (no auth runtime), usable from services and tests. */
export function hasPermission(
  user: { permissions: ReadonlySet<PermissionKey> } | null,
  key: PermissionKey,
): boolean {
  return user?.permissions.has(key) ?? false;
}
