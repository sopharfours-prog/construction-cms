import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";

/**
 * GET /api/account/me — who is signed in, for the public site's account menu
 * (public pages are cached, so they ask the browser's own session). Only a
 * name and photo; `{ user: null }` when signed out. Never cached.
 */
export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json(
    { user: user ? { name: user.name, avatarUrl: user.avatarUrl } : null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
