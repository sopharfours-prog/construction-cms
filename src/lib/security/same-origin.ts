/**
 * CSRF defence for cookie-authenticated route handlers (server actions get
 * this from Next.js; route handlers don't). A state-changing request must
 * carry an Origin header matching the host it was sent to.
 */
export function isSameOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  if (!origin) return false;
  const host = headers.get("x-forwarded-host")?.split(",")[0]?.trim() || headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
