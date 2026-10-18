"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { setAdminLocaleCookie } from "@/i18n/admin-locale-cookie";
import { signOut } from "@/lib/auth/auth";
import type { ActionResult } from "@/lib/actions";
import {
  changeOwnPasswordSchema,
  profileInputSchema,
  roleInputSchema,
  setPasswordSchema,
  userCreateSchema,
  userUpdateSchema,
} from "@/lib/validation/users";
import {
  changeOwnPassword,
  createRole,
  createUser,
  deleteRole,
  deleteUser,
  sendUserPasswordLink,
  setUserPassword,
  setUserStatus,
  updateRole,
  updateUser,
} from "@/server/services/users";

import { signOutEverywhere, updateOwnProfile } from "@/server/services/account";

import { runAction } from "./run";

const id = z.object({ id: z.uuid() });
const refresh = () => {
  revalidatePath("/admin/users");
  revalidatePath("/admin/roles");
};

export async function createUserAction(_prev: ActionResult<unknown> | null, formData: FormData) {
  const r = await runAction("users.create", userCreateSchema, formData, createUser);
  if (r.ok) refresh();
  return r;
}

export async function updateUserAction(
  userId: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
) {
  const r = await runAction("users.update", userUpdateSchema, formData, (input, ctx) =>
    updateUser(z.uuid().parse(userId), input, ctx),
  );
  if (r.ok) refresh();
  return r;
}

export async function setUserStatusAction(userId: string, status: "ACTIVE" | "DISABLED") {
  const r = await runAction(
    "users.update",
    id.extend({ status: z.enum(["ACTIVE", "DISABLED"]) }),
    { id: userId, status },
    (d, ctx) => setUserStatus(d.id, d.status, ctx),
  );
  if (r.ok) refresh();
  return r;
}

export async function deleteUserAction(userId: string) {
  const r = await runAction("users.delete", id, { id: userId }, (d, ctx) => deleteUser(d.id, ctx));
  if (r.ok) refresh();
  return r;
}

export async function setUserPasswordAction(
  userId: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
) {
  return runAction("users.update", setPasswordSchema, formData, (d, ctx) =>
    setUserPassword(z.uuid().parse(userId), d.password, ctx),
  );
}

/** Any signed-in user: their own name and language. A new language applies at once. */
export async function updateOwnProfileAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
) {
  const r = await runAction(null, profileInputSchema, formData, updateOwnProfile);
  if (r.ok) {
    const locale = formData.get("preferredLocale");
    if (typeof locale === "string" && locale) await setAdminLocaleCookie(locale);
    revalidatePath("/admin", "layout");
  }
  return r;
}

/** Any signed-in user: end every one of their sessions, then sign in again here. */
export async function signOutEverywhereAction(): Promise<ActionResult<{ id: string }>> {
  const r = await runAction(null, z.object({}), {}, (_d, ctx) => signOutEverywhere(ctx));
  if (r.ok) await signOut({ redirectTo: "/admin/login" });
  return r;
}

/** Any signed-in user, for their own account only (the id comes from the session). */
export async function changeOwnPasswordAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
) {
  return runAction(null, changeOwnPasswordSchema, formData, changeOwnPassword);
}

export async function sendUserPasswordLinkAction(userId: string) {
  return runAction("users.update", id, { id: userId }, (d, ctx) => sendUserPasswordLink(d.id, ctx));
}

export async function saveRoleAction(
  roleId: string | null,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
) {
  const r = await runAction("roles.manage", roleInputSchema, formData, (input, ctx) =>
    roleId ? updateRole(z.uuid().parse(roleId), input, ctx) : createRole(input, ctx),
  );
  if (r.ok) refresh();
  return r;
}

export async function deleteRoleAction(roleId: string) {
  const r = await runAction("roles.manage", id, { id: roleId }, (d, ctx) => deleteRole(d.id, ctx));
  if (r.ok) refresh();
  return r;
}
