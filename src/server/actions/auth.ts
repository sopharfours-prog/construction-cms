"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { headers } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/lib/auth/auth";
import { writeAuditLog } from "@/server/services/audit";
import { getCurrentUser } from "@/lib/auth/session";
import { safeAdminCallbackUrl } from "@/lib/security/redirect";
import { getRequestInfo } from "@/lib/security/request-info";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type AuthErrorKey,
} from "@/lib/validation/auth";
import { requestPasswordReset, resetPassword } from "@/server/services/auth/password-reset";
import { notifyAdministrators, requestStaffAccount } from "@/server/services/auth/registration";

/**
 * Form state returned to the client. Messages are keys into the admin
 * dictionary, so the UI renders them in the admin's language.
 */
export type AuthFormState = {
  status: "idle" | "error" | "success";
  error?:
    | AuthErrorKey
    | "invalidCredentials"
    | "rateLimited"
    | "unexpected"
    | "registrationClosed"
    | "registrationRetry"
    | "registrationRateLimited";
  fieldErrors?: Partial<Record<"name" | "email" | "password" | "confirmPassword", AuthErrorKey>>;
  /** Echoed back so the fields keep their value after an error. */
  email?: string;
  name?: string;
};

function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: AuthFormState["fieldErrors"] = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (
      (field === "name" ||
        field === "email" ||
        field === "password" ||
        field === "confirmPassword") &&
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

/**
 * Sign out. Used as a form action; an optional `redirectTo` field (a path on
 * this site) returns the person to the page they were on.
 */
export async function logoutAction(form?: FormData): Promise<void> {
  const redirectTo = form instanceof FormData ? form.get("redirectTo") : null;
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
  // Only a path on this site: never an open redirect.
  const target =
    typeof redirectTo === "string" && /^\/(?![/\\])[^\s]*$/.test(redirectTo)
      ? redirectTo
      : "/admin/login";
  await signOut({ redirectTo: target });
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

  // Same answer, and the same response time, whether or not the account exists:
  // looking up the account and sending the email happen after the response.
  const request = getRequestInfo(await headers());
  after(() => requestPasswordReset(parsed.data.email, request));
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

/** Public: ask for a staff account. An administrator approves it before it can sign in. */
export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const parsed = registerSchema.safeParse({
    name,
    email,
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), name, email };
  }

  const result = await requestStaffAccount(
    parsed.data,
    {
      website: String(formData.get("website") ?? ""),
      formToken: String(formData.get("formToken") ?? ""),
    },
    getRequestInfo(await headers()),
  );
  if (result.ok) {
    const created = result.created;
    if (created) after(() => notifyAdministrators(created));
    return { status: "success" };
  }
  const error = (
    {
      closed: "registrationClosed",
      retry: "registrationRetry",
      rateLimited: "registrationRateLimited",
    } as const
  )[result.reason];
  return { status: "error", error, name, email };
}
