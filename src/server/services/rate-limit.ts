import "server-only";

import { db } from "@/lib/db/client";
import { sha256 } from "@/lib/security/tokens";

export type RateLimitRule = { limit: number; windowSeconds: number };

export type RateLimitResult = {
  allowed: boolean;
  count: number;
  retryAfterSeconds: number;
};

/** Named rules, so limits are tuned in one place. */
export const rateLimits = {
  /** Every login attempt from one IP (successful or not). */
  loginPerIp: { limit: 20, windowSeconds: 15 * 60 },
  /** Failed logins for one email, whether or not the account exists. */
  loginFailuresPerEmail: { limit: 5, windowSeconds: 15 * 60 },
  /** Staff account requests from the public registration form. */
  registrationPerIp: { limit: 5, windowSeconds: 60 * 60 },
  passwordResetPerIp: { limit: 10, windowSeconds: 60 * 60 },
  passwordResetPerEmail: { limit: 3, windowSeconds: 60 * 60 },
  /** Wrong "current password" entries when changing one's own password. */
  passwordChangeFailuresPerUser: { limit: 5, windowSeconds: 15 * 60 },
  uploadsPerUser: { limit: 200, windowSeconds: 60 * 60 },
  publicFormPerIp: { limit: 5, windowSeconds: 10 * 60 },
  /** Every public form request from one connection, counted before the body is read. */
  publicFormRequestsPerIp: { limit: 30, windowSeconds: 10 * 60 },
  /** New website chats from one connection. */
  chatStartPerIp: { limit: 5, windowSeconds: 60 * 60 },
  /** Visitor chat messages from one connection, and within one conversation. */
  chatMessagesPerIp: { limit: 60, windowSeconds: 10 * 60 },
  chatMessagesPerConversation: { limit: 20, windowSeconds: 5 * 60 },
  publicFormPerEmail: { limit: 10, windowSeconds: 24 * 60 * 60 },
  replyPerUser: { limit: 60, windowSeconds: 60 * 60 },
} as const satisfies Record<string, RateLimitRule>;

/** Keys hold digests only: no raw emails or IPs in the table. */
export function rateLimitKey(scope: string, identifier: string): string {
  return `${scope}:${sha256(identifier.toLowerCase())}`;
}

/** ttl is computed by PostgreSQL, so results do not depend on the server timezone. */
type Row = { count: number; ttl: number };

/**
 * Increment and check a fixed-window counter in one atomic statement.
 * Concurrent requests cannot both read "under the limit": PostgreSQL
 * serialises the ON CONFLICT update on the row.
 */
export async function consumeRateLimit(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
  const rows = await db.$queryRaw<Row[]>`
    INSERT INTO rate_limits (key, count, window_started_at, expires_at)
    VALUES (
      ${key}, 1,
      (now() AT TIME ZONE 'UTC'),
      (now() AT TIME ZONE 'UTC') + make_interval(secs => ${rule.windowSeconds})
    )
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.expires_at <= (now() AT TIME ZONE 'UTC')
                   THEN 1 ELSE rate_limits.count + 1 END,
      window_started_at = CASE WHEN rate_limits.expires_at <= (now() AT TIME ZONE 'UTC')
                   THEN (now() AT TIME ZONE 'UTC') ELSE rate_limits.window_started_at END,
      expires_at = CASE WHEN rate_limits.expires_at <= (now() AT TIME ZONE 'UTC')
                   THEN (now() AT TIME ZONE 'UTC') + make_interval(secs => ${rule.windowSeconds})
                   ELSE rate_limits.expires_at END
    RETURNING count,
      GREATEST(0, CEIL(EXTRACT(EPOCH FROM (expires_at - (now() AT TIME ZONE 'UTC')))))::int AS ttl`;

  maybeCleanup();
  return toResult(rows[0], rule);
}

/** Read a counter without incrementing it. */
export async function peekRateLimit(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
  const rows = await db.$queryRaw<Row[]>`
    SELECT count,
      GREATEST(0, CEIL(EXTRACT(EPOCH FROM (expires_at - (now() AT TIME ZONE 'UTC')))))::int AS ttl
    FROM rate_limits
    WHERE key = ${key} AND expires_at > (now() AT TIME ZONE 'UTC')`;
  return rows[0]
    ? toResult(rows[0], rule, { peek: true })
    : { allowed: true, count: 0, retryAfterSeconds: 0 };
}

export async function resetRateLimit(key: string): Promise<void> {
  await db.rateLimit.deleteMany({ where: { key } });
}

function toResult(
  row: Row | undefined,
  rule: RateLimitRule,
  opts?: { peek?: boolean },
): RateLimitResult {
  if (!row) return { allowed: true, count: 0, retryAfterSeconds: 0 };
  const count = Number(row.count);
  const allowed = opts?.peek ? count < rule.limit : count <= rule.limit;
  return {
    allowed,
    count,
    retryAfterSeconds: allowed ? 0 : Math.max(1, Number(row.ttl)),
  };
}

/** Occasionally delete expired counters so the table stays small. */
function maybeCleanup() {
  if (Math.random() > 0.01) return;
  db.$executeRaw`DELETE FROM rate_limits WHERE expires_at < (now() AT TIME ZONE 'UTC')`.catch(
    (error: unknown) => console.error("[rate-limit] cleanup failed", error),
  );
}
