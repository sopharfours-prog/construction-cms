import "server-only";

import { siteConfig } from "@/config/site";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db/client";
import { getServerEnv } from "@/lib/env/server";
import { sendMail } from "@/lib/mail/mailer";
import { checkFormToken } from "@/lib/security/form-token";
import type { RequestInfo } from "@/lib/security/request-info";
import { writeAuditLog } from "@/server/services/audit";
import { consumeRateLimit, rateLimitKey, rateLimits } from "@/server/services/rate-limit";
import { getSetting } from "@/server/services/settings";

/** Role given to a request until an administrator chooses the real one. It grants nothing while PENDING. */
const PLACEHOLDER_ROLE = "VIEWER";
/** Requests waiting for a decision. Beyond this the form closes, so it can't be used to fill the table. */
export const MAX_PENDING_REQUESTS = 50;

/** Off with ALLOW_REGISTRATION=false: the button disappears and the form answers 404. */
export function isRegistrationOpen(): boolean {
  return process.env.ALLOW_REGISTRATION !== "false";
}

export type RegistrationResult =
  /** `created`: a new request was stored; the caller tells the administrators (see notifyAdministrators). */
  | { ok: true; created?: { id: string; name: string; email: string } }
  | { ok: false; reason: "closed" | "rateLimited" | "retry" };

/**
 * A visitor asks for a staff account. Nothing they submit grants access: the
 * account is created PENDING (sign-in refuses it) and an administrator must
 * pick a role and activate it.
 *
 * The answer is the same whether or not the email already has an account, so
 * the form can't be used to find out who works here.
 */
export async function requestStaffAccount(
  input: { name: string; email: string; password: string },
  guard: { website?: string; formToken?: string },
  request: RequestInfo,
): Promise<RegistrationResult> {
  if (!isRegistrationOpen()) return { ok: false, reason: "closed" };
  // Honeypot filled: a bot. Look successful, store nothing.
  if (guard.website) return { ok: true };
  // Sent too soon after the page loaded, or the page sat open for a day.
  if (checkFormToken(guard.formToken, getServerEnv().AUTH_SECRET) !== "ok")
    return { ok: false, reason: "retry" };

  const limit = await consumeRateLimit(
    rateLimitKey("register:ip", request.ipAddress ?? "unknown"),
    rateLimits.registrationPerIp,
  );
  if (!limit.allowed) return { ok: false, reason: "rateLimited" };

  const email = input.email.trim().toLowerCase();
  const [existing, pending, role] = await Promise.all([
    db.user.findUnique({ where: { email }, select: { id: true } }),
    db.user.count({ where: { status: "PENDING", deletedAt: null } }),
    db.role.findUnique({ where: { key: PLACEHOLDER_ROLE }, select: { id: true } }),
  ]);
  // Hashed before the checks below so a known email answers no faster than a
  // new one: the response time must not reveal who already has an account.
  const passwordHash = await hashPassword(input.password);
  // Already registered (or already asked): same answer, nothing changes.
  if (existing) return { ok: true };
  if (pending >= MAX_PENDING_REQUESTS || !role) return { ok: false, reason: "closed" };

  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { name: input.name, email, passwordHash, roleId: role.id, status: "PENDING" },
      select: { id: true },
    });
    await writeAuditLog(
      {
        action: "CREATE",
        entity: "User",
        entityId: created.id,
        newValue: { name: input.name, email, status: "PENDING", via: "registration form" },
        request,
      },
      tx,
    );
    return created;
  });

  return { ok: true, created: { id: user.id, name: input.name, email } };
}

/**
 * Best effort: the request is already saved and visible in the CMS. Sent after
 * the response, so a new email doesn't answer slower than a known one.
 */
export async function notifyAdministrators({
  id: userId,
  name,
  email,
}: {
  id: string;
  name: string;
  email: string;
}) {
  try {
    const contact = await getSetting("contact");
    const to = contact?.notificationEmail ?? contact?.email;
    if (!to) return;
    await sendMail({
      to,
      subject: "ມີຄຳຂໍບັນຊີພະນັກງານໃໝ່ / New staff account request",
      text: [
        "ມີຜູ້ຂໍບັນຊີເຂົ້າໃຊ້ລະບົບຈັດການເນື້ອຫາ. ກະລຸນາກວດສອບ ແລະ ອະນຸມັດ ຫຼື ລຶບຄຳຂໍ.",
        "Someone asked for an account in the content management system. Review it, then approve or delete the request.",
        "",
        `Name: ${name.replace(/[\r\n]+/g, " ")}`,
        `Email: ${email}`,
        "",
        `${siteConfig.url}/admin/users/${userId}`,
      ].join("\n"),
    });
  } catch (error) {
    console.error("[registration] notification email failed", error);
  }
}
