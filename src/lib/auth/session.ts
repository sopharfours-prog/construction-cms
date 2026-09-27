import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { db } from "@/lib/db/client";
import { isPermissionKey, type PermissionKey } from "@/lib/permissions/registry";

import { auth } from "./auth";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  preferredLocale: string | null;
  role: { key: string; name: string };
  permissions: ReadonlySet<PermissionKey>;
};

/**
 * The signed-in user, re-validated against the database on every request
 * (deduplicated within a request by React cache()). Returns null when there is
 * no session, or when the account was disabled, deleted, locked or had its
 * session version bumped (password change, "sign out everywhere").
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await db.user.findFirst({
    where: { id: userId, deletedAt: null, status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      email: true,
      preferredLocale: true,
      sessionVersion: true,
      lockedUntil: true,
      avatar: { select: { url: true } },
      role: {
        select: {
          key: true,
          name: true,
          permissions: { select: { permission: { select: { key: true } } } },
        },
      },
    },
  });

  if (!user || user.sessionVersion !== session.sessionVersion) return null;
  if (user.lockedUntil && user.lockedUntil > new Date()) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatar?.url ?? null,
    preferredLocale: user.preferredLocale,
    role: { key: user.role.key, name: user.role.name },
    permissions: new Set(
      user.role.permissions.map((rp) => rp.permission.key).filter(isPermissionKey),
    ),
  };
});

export function hasPermission(
  user: Pick<CurrentUser, "permissions"> | null,
  key: PermissionKey,
): boolean {
  return user?.permissions.has(key) ?? false;
}

/** Pages/layouts: signed-in user or redirect to the login page. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}

/** Pages: user holding `key`, or the 403 page. */
export async function requirePermission(key: PermissionKey): Promise<CurrentUser> {
  const user = await requireUser();
  if (!hasPermission(user, key)) redirect("/admin/forbidden");
  return user;
}

export class AuthorizationError extends Error {
  constructor(readonly status: 401 | 403) {
    super(status === 401 ? "Unauthenticated" : "Forbidden");
    this.name = "AuthorizationError";
  }
}

/** Server actions and services: user holding `key`, or throws AuthorizationError. */
export async function authorize(key: PermissionKey): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError(401);
  if (!hasPermission(user, key)) throw new AuthorizationError(403);
  return user;
}

/**
 * Route handlers: `{ user }` or a ready-made 401/403 JSON response.
 *   const result = await authorizeRequest("projects.view");
 *   if (result instanceof Response) return result;
 */
export async function authorizeRequest(
  key: PermissionKey,
): Promise<{ user: CurrentUser } | Response> {
  try {
    return { user: await authorize(key) };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json(
        { error: error.status === 401 ? "unauthorized" : "forbidden" },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    throw error;
  }
}
