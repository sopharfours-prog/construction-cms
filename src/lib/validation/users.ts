import { z } from "zod";

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";
import { allPermissions, type PermissionKey } from "@/lib/permissions/registry";

import { listOf, optionalText, optionalUuid, requiredText } from "./content";

const email = z
  .string({ error: "required" })
  .trim()
  .toLowerCase()
  .min(1, { error: "required" })
  .max(254, { error: "tooLong" })
  .pipe(z.email({ error: "emailInvalid" }));

export const password = z
  .string({ error: "required" })
  .min(PASSWORD_MIN_LENGTH, { error: "passwordTooShort" })
  .max(PASSWORD_MAX_LENGTH, { error: "tooLong" });

const userFields = {
  name: requiredText(120),
  email,
  roleId: z.uuid({ error: "required" }),
  status: z.enum(["ACTIVE", "DISABLED"], { error: "invalid" }),
  preferredLocale: z
    .enum(["lo", "en", ""])
    .optional()
    .transform((v) => v || null),
  avatarId: optionalUuid,
};

/** New user: either an initial password, or an emailed link to set one. */
export const userCreateSchema = z
  .object({
    ...userFields,
    passwordMode: z.enum(["email", "set"]).catch("email"),
    password: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.passwordMode !== "set") return;
    const check = password.safeParse(value.password ?? "");
    if (!check.success)
      ctx.addIssue({ code: "custom", path: ["password"], message: check.error.issues[0]!.message });
  });
export type UserCreateInput = z.output<typeof userCreateSchema>;

/** PENDING is only ever kept (editing a request without deciding), never set. */
export const userUpdateSchema = z.object({
  ...userFields,
  status: z.enum(["ACTIVE", "DISABLED", "PENDING"], { error: "invalid" }),
});
export type UserUpdateInput = z.output<typeof userUpdateSchema>;

export const setPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "passwordMismatch",
  });

/** A signed-in user's own profile. Email and role are changed by an administrator. */
export const profileInputSchema = z.object({
  name: userFields.name,
  preferredLocale: userFields.preferredLocale,
});
export type ProfileInput = z.output<typeof profileInputSchema>;

/** Signed-in user changing their own password: proves they know the current one. */
export const changeOwnPasswordSchema = z
  .object({
    currentPassword: z
      .string({ error: "required" })
      .min(1, { error: "required" })
      .max(PASSWORD_MAX_LENGTH, { error: "tooLong" }),
    password,
    confirmPassword: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.password !== v.confirmPassword)
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "passwordMismatch" });
    if (v.password === v.currentPassword)
      ctx.addIssue({ code: "custom", path: ["password"], message: "passwordUnchanged" });
  });

const permissionKeys = allPermissions.map((p) => p.key) as [PermissionKey, ...PermissionKey[]];

export const roleInputSchema = z.object({
  name: requiredText(80),
  description: optionalText(300),
  permissions: listOf(
    z.enum(permissionKeys, { error: "invalid" }),
    permissionKeys.length,
  ).transform((keys) => [...new Set(keys)]),
});
export type RoleInput = z.output<typeof roleInputSchema>;
