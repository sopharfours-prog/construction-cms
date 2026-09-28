import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Anti-spam token for public forms: the time the form was rendered, signed
 * with the app secret. Submissions faster than a human could type, older
 * than a day, or with a forged time are rejected. Not a CSRF token (public
 * forms carry no session); it only raises the cost of automated spam.
 */
const MIN_AGE_MS = 3_000;
const MAX_AGE_MS = 24 * 3600_000;

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(`form-token:${value}`).digest("base64url");
}

export function createFormToken(secret: string, now = Date.now()): string {
  const issued = String(now);
  return `${issued}.${sign(issued, secret)}`;
}

export type FormTokenCheck = "ok" | "invalid" | "tooFast" | "expired";

export function checkFormToken(token: unknown, secret: string, now = Date.now()): FormTokenCheck {
  if (typeof token !== "string" || token.length > 100) return "invalid";
  const [issued, signature] = token.split(".");
  if (!issued || !signature || !/^\d{13}$/.test(issued)) return "invalid";
  const expected = Buffer.from(sign(issued, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return "invalid";
  const age = now - Number(issued);
  if (age < MIN_AGE_MS) return "tooFast";
  if (age > MAX_AGE_MS) return "expired";
  return "ok";
}
