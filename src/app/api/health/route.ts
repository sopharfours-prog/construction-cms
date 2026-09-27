import { db } from "@/lib/db/client";

// Always evaluated per request: a prerendered "ok" would hide an outage.
export const dynamic = "force-dynamic";

/**
 * Liveness + database readiness for Docker, load balancers and uptime checks.
 * Public on purpose, so it returns no versions, hostnames or error details.
 */
export async function GET() {
  const headers = { "Cache-Control": "no-store" };

  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", database: "ok" }, { headers });
  } catch (error) {
    console.error("[health] database check failed", error);
    return Response.json({ status: "error", database: "unavailable" }, { status: 503, headers });
  }
}
