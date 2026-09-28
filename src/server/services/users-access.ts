import "server-only";

import type { CurrentUser } from "@/lib/auth/session";

import { listRoles } from "./users";

/** Roles the current user may assign or manage: every permission of the role is one they hold. */
export async function rolesWithinActor(user: CurrentUser) {
  const roles = await listRoles();
  return roles.map((r) => ({
    ...r,
    withinActor: r.permissions.every((p) => user.permissions.has(p)),
  }));
}
