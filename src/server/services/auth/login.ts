import "server-only";

import { hashPassword, needsRehash, verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db/client";
import type { RequestInfo } from "@/lib/security/request-info";
import { writeAuditLog } from "@/server/services/audit";
import {
  consumeRateLimit,
  peekRateLimit,
  rateLimitKey,
  rateLimits,
  resetRateLimit,
} from "@/server/services/rate-limit";

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_DURATION_MS = 15 * 60 * 1000;

export type LoginResult =
  | { ok: true; user: { id: string; name: string; email: string; sessionVersion: number } }
  | { ok: false; reason: "invalid" | "rate_limited" };

let dummyHashPromise: Promise<string> | undefined;

/**
 * A real Argon2id hash verified when the account does not exist, so the
 * response takes as long as a wrong-password attempt and timing cannot reveal
 * which emails are registered.
 */
function getDummyHash() {
  dummyHashPromise ??= hashPassword(crypto.randomUUID());
  return dummyHashPromise;
}

/**
 * Check credentials with rate limiting, account lockout and audit logging.
 * Every failure mode returns the same "invalid" (or "rate_limited") result,
 * so callers cannot distinguish unknown emails, wrong passwords or disabled
 * accounts.
 */
export async function authenticateWithPassword(
  input: { email: string; password: string },
  request: RequestInfo,
): Promise<LoginResult> {
  const email = input.email.trim().toLowerCase();
  const emailKey = rateLimitKey("login-fail:email", email);

  // 1. Throttle by IP (all attempts) and by email (failures only).
  if (request.ipAddress) {
    const ip = await consumeRateLimit(
      rateLimitKey("login:ip", request.ipAddress),
      rateLimits.loginPerIp,
    );
    if (!ip.allowed) return rateLimited(email, request, "ip_rate_limit");
  }
  const emailLimit = await peekRateLimit(emailKey, rateLimits.loginFailuresPerEmail);
  if (!emailLimit.allowed) return rateLimited(email, request, "email_rate_limit");

  // 2. Look up the account. Soft-deleted users do not exist for login.
  const user = await db.user.findFirst({
    where: { email, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      status: true,
      lockedUntil: true,
      failedLoginAttempts: true,
      sessionVersion: true,
    },
  });

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    return rateLimited(email, request, "account_locked", user.id);
  }

  // 3. Verify, always spending the same work.
  const usable = user && user.status === "ACTIVE" && user.passwordHash;
  const passwordOk = await verifyPassword(
    usable ? user.passwordHash! : await getDummyHash(),
    input.password,
  );

  if (!user || !usable || !passwordOk) {
    await consumeRateLimit(emailKey, rateLimits.loginFailuresPerEmail);

    if (user && usable) {
      const attempts = user.failedLoginAttempts + 1;
      const lock = attempts >= MAX_FAILED_ATTEMPTS;
      await db.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: lock ? 0 : attempts,
          lockedUntil: lock ? new Date(Date.now() + LOCK_DURATION_MS) : undefined,
        },
      });
    }

    await writeAuditLog({
      action: "LOGIN_FAILED",
      entity: "User",
      entityId: user?.id ?? null,
      userId: user?.id ?? null,
      newValue: {
        email,
        reason: !user ? "unknown_email" : !usable ? "account_unusable" : "wrong_password",
      },
      request,
    });
    return { ok: false, reason: "invalid" };
  }

  // 4. Success: clear counters, upgrade the hash if parameters changed.
  await db.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      ...(needsRehash(user.passwordHash!)
        ? { passwordHash: await hashPassword(input.password) }
        : {}),
    },
  });
  await resetRateLimit(emailKey);
  await writeAuditLog({
    action: "LOGIN",
    entity: "User",
    entityId: user.id,
    userId: user.id,
    request,
  });

  return {
    ok: true,
    user: { id: user.id, name: user.name, email: user.email, sessionVersion: user.sessionVersion },
  };
}

async function rateLimited(
  email: string,
  request: RequestInfo,
  reason: string,
  userId?: string,
): Promise<LoginResult> {
  await writeAuditLog({
    action: "LOGIN_FAILED",
    entity: "User",
    entityId: userId ?? null,
    userId: userId ?? null,
    newValue: { email, reason },
    request,
  });
  return { ok: false, reason: "rate_limited" };
}
