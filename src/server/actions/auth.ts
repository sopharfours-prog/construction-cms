"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/lib/auth/auth";
import { writeAuditLog } from "@/server/services/audit";
import { getCurrentUser } from "@/lib/auth/session";
import { safeAdminCallbackUrl } from "@/lib/security/redirect";
import { getRequestInfo } from "@/lib/security/request-info";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  type AuthErrorKey,
} from "@/lib/validation/auth";
import { requestPasswordReset, resetPassword } from "@/server/services/auth/password-reset";

/**
 * Form state returned to the client. Messages are keys into the admin
 * dictionary, so the UI renders them in the admin's language.
 */
export type AuthFormState = {
  status: "idle" | "error" | "success";
  error?: AuthErrorKey | "invalidCredentials" | "rateLimited" | "unexpected";
  fieldErrors?: Partial<Record<"email" | "password" | "confirmPassword", AuthErrorKey>>;
  /** Echoed back so the email field keeps its value after an error. */
  email?: string;
};

function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: AuthFormState["fieldErrors"] = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (
      (field === "email" || field === "password" || field === "confirmPassword") &&
      !fieldErrors[field]
    ) {
      fieldErrors[field] = issue.message as AuthErrorKey;
    }
  }
  return fieldErrors;
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const rawEmail = String(formData.get("email") ?? "");
  const parsed = loginSchema.safeParse({
    email: rawEmail,
    password: formData.get("password"),
    remember: formData.get("remember") === "on",
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), email: rawEmail };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      remember: String(parsed.data.remember),
      redirect: false,
    });
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      return {
        status: "error",
        error: error.code === "rate_limited" ? "rateLimited" : "invalidCredentials",
        email: parsed.data.email,
      };
    }
    if (error instanceof AuthError) {
      console.error("[auth] sign-in failed", error.type);
      return { status: "error", error: "unexpected", email: parsed.data.email };
    }
    throw error;
  }

  redirect(safeAdminCallbackUrl(formData.get("callbackUrl")));
}

export async function logoutAction(): Promise<void> {
  // Recorded here rather than in the Auth.js signOut event, which has no
  // request and so could not store the IP address and browser.
  const user = await getCurrentUser();
  if (user) {
    await writeAuditLog({
      action: "LOGOUT",
      entity: "User",
      entityId: user.id,
      userId: user.id,
      request: getRequestInfo(await headers()),
    });
  }
  await signOut({ redirectTo: "/admin/login" });
}

export async function forgotPasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const rawEmail = String(formData.get("email") ?? "");
  const parsed = forgotPasswordSchema.safeParse({ email: rawEmail });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), email: rawEmail };
  }

  await requestPasswordReset(parsed.data.email, getRequestInfo(await headers()));
  // Same answer whether or not the account exists.
  return { status: "success" };
}

export async function resetPasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const tokenIssue = parsed.error.issues.some((i) => i.path[0] === "token");
    return tokenIssue
      ? { status: "error", error: "tokenInvalid" }
      : { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const result = await resetPassword(
    parsed.data.token,
    parsed.data.password,
    getRequestInfo(await headers()),
  );
  return result.ok ? { status: "success" } : { status: "error", error: "tokenInvalid" };
}
