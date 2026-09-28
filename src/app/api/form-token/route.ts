import { getServerEnv } from "@/lib/env/server";
import { createFormToken } from "@/lib/security/form-token";

/**
 * Fresh anti-spam token for public forms. Fetched when the form mounts, not
 * embedded in the page, because public pages are cached (a cached token
 * would be too old).
 */
export function GET() {
  return Response.json(
    { token: createFormToken(getServerEnv().AUTH_SECRET) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
