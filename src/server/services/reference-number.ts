// No "server-only" import: the seed script uses this too.
import type { PrismaClient } from "../../generated/prisma/client";

type Sql = Pick<PrismaClient, "$queryRaw">;

const PREFIX = { quote: "Q" } as const;
export type ReferenceScope = keyof typeof PREFIX;

/**
 * Next human-readable number for the year, e.g. Q-2026-000042. One atomic
 * statement: concurrent requests each get a different value (PostgreSQL row
 * lock on the counter). Numbering restarts every year (Asia/Vientiane).
 * Call inside the transaction that inserts the row, so a rollback does not
 * matter beyond leaving a gap, which is acceptable for reference numbers.
 */
export async function nextReferenceNumber(
  sql: Sql,
  scope: ReferenceScope,
  at = new Date(),
): Promise<string> {
  const year = new Date(at.getTime() + 7 * 3600_000).getUTCFullYear();
  const rows = await sql.$queryRaw<{ value: number }[]>`
    INSERT INTO reference_counters (scope, year, value, updated_at)
    VALUES (${scope}, ${year}, 1, CURRENT_TIMESTAMP)
    ON CONFLICT (scope, year) DO UPDATE SET value = reference_counters.value + 1, updated_at = CURRENT_TIMESTAMP
    RETURNING value`;
  return `${PREFIX[scope]}-${year}-${String(rows[0]!.value).padStart(6, "0")}`;
}
