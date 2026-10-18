import { z } from "zod";

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";

/**
 * Error messages are message keys (resolved by the UI in the admin's
 * language), not display text.
 */
const email = z
  .string({ error: "emailRequired" })
  .trim()
  .toLowerCase()
  .min(1, { error: "emailRequired" })
  .max(254, { error: "emailInvalid" })
  .pipe(z.email({ error: "emailInvalid" }));

const newPassword = z
  .string({ error: "passwordRequired" })
  .min(PASSWORD_MIN_LENGTH, { error: "passwordTooShort" })
  .max(PASSWORD_MAX_LENGTH, { error: "passwordTooLong" });

export const loginSchema = z.object({
  email,
  // Existing passwords are not re-validated for strength, only bounded.
  password: z
    .string({ error: "passwordRequired" })
    .min(1, { error: "passwordRequired" })
    .max(PASSWORD_MAX_LENGTH, { error: "passwordTooLong" }),
  remember: z.boolean().default(false),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    token: z.string().regex(/^[A-Za-z0-9_-]{43}$/, { error: "tokenInvalid" }),
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    error: "passwordMismatch",
  });

/** Public request for a staff account. The applicant chooses the password they will sign in with once approved. */
export const registerSchema = z
  .object({
    name: z
      .string({ error: "nameRequired" })
      .trim()
      .min(2, { error: "nameRequired" })
      .max(120, { error: "nameTooLong" }),
    email,
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    error: "passwordMismatch",
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type AuthErrorKey =
  | "emailRequired"
  | "emailInvalid"
  | "passwordRequired"
  | "passwordTooShort"
  | "passwordTooLong"
  | "passwordMismatch"
  | "tokenInvalid"
  | "nameRequired"
  | "nameTooLong";
