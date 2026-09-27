import "server-only";

import { defaultLocale, type Locale } from "@/config/i18n";
import { siteConfig } from "@/config/site";
import { getMessages } from "@/i18n/messages";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db/client";
import { sendMail } from "@/lib/mail/mailer";
import type { RequestInfo } from "@/lib/security/request-info";
import { generateToken, sha256 } from "@/lib/security/tokens";
import { writeAuditLog } from "@/server/services/audit";
import { consumeRateLimit, rateLimitKey, rateLimits } from "@/server/services/rate-limit";

export const RESET_TOKEN_TTL_MINUTES = 30;

/**
 * Start a password reset. Always resolves the same way whether or not the
 * email belongs to an account, so the form cannot be used to discover users.
 */
export async function requestPasswordReset(email: string, request: RequestInfo): Promise<void> {
  const normalized = email.trim().toLowerCase();

  const byIp = request.ipAddress
    ? await consumeRateLimit(
        rateLimitKey("reset:ip", request.ipAddress),
        rateLimits.passwordResetPerIp,
      )
    : { allowed: true };
  const byEmail = await consumeRateLimit(
    rateLimitKey("reset:email", normalized),
    rateLimits.passwordResetPerEmail,
  );
  if (!byIp.allowed || !byEmail.allowed) return;

  const user = await db.user.findFirst({
    where: { email: normalized, deletedAt: null, status: "ACTIVE" },
    select: { id: true, email: true, preferredLocale: true },
  });
  if (!user) return;

  const token = generateToken();
  const now = new Date();

  await db.$transaction([
    // Only the newest link works.
    db.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: now },
    }),
    db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(token),
        expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
      },
    }),
  ]);

  const link = `${siteConfig.url}/admin/reset-password?token=${encodeURIComponent(token)}`;
  const locale: Locale = user.preferredLocale === "en" ? "en" : defaultLocale;
  const primary = getMessages(locale).auth.resetEmail;
  const secondary = getMessages(locale === "en" ? "lo" : "en").auth.resetEmail;

  try {
    await sendMail({
      to: user.email,
      subject: `${primary.subject} / ${secondary.subject}`,
      text: [
        primary.body(RESET_TOKEN_TTL_MINUTES),
        link,
        primary.ignore,
        "",
        "—",
        "",
        secondary.body(RESET_TOKEN_TTL_MINUTES),
        link,
        secondary.ignore,
      ].join("\n"),
    });
  } catch (error) {
    // Logged for operators; the visitor still sees the generic confirmation.
    console.error("[password-reset] could not send email", error);
  }
}

export type ResetResult = { ok: true } | { ok: false; reason: "invalid_or_expired" };

/** Complete a reset: one-time token, new hash, every existing session revoked. */
export async function resetPassword(
  token: string,
  newPassword: string,
  request: RequestInfo,
): Promise<ResetResult> {
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { select: { id: true, status: true, deletedAt: true } } },
  });

  const valid =
    record &&
    !record.usedAt &&
    record.expiresAt > new Date() &&
    record.user.status === "ACTIVE" &&
    !record.user.deletedAt;
  if (!valid) return { ok: false, reason: "invalid_or_expired" };

  const passwordHash = await hashPassword(newPassword);
  const now = new Date();

  // Claim the token atomically: a double submit cannot reset twice.
  const claimed = await db.$transaction(async (tx) => {
    const claim = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: now },
    });
    if (claim.count !== 1) return false;

    await tx.user.update({
      where: { id: record.userId },
      data: {
        passwordHash,
        sessionVersion: { increment: 1 },
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    await tx.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: now },
    });
    await writeAuditLog(
      {
        action: "PASSWORD_RESET",
        entity: "User",
        entityId: record.userId,
        userId: record.userId,
        request,
      },
      tx,
    );
    return true;
  });

  return claimed ? { ok: true } : { ok: false, reason: "invalid_or_expired" };
}
