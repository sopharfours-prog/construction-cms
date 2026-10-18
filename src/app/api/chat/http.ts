import "server-only";

import { NextResponse } from "next/server";

import { getServerEnv } from "@/lib/env/server";
import { CHAT_COOKIE, CHAT_COOKIE_MAX_AGE } from "@/server/services/chat";

/** The visitor's conversation token, from the httpOnly cookie. */
export function chatToken(request: Request): string | undefined {
  const header = request.headers.get("cookie") ?? "";
  const match = header.split(/;\s*/).find((part) => part.startsWith(`${CHAT_COOKIE}=`));
  if (!match) return undefined;
  try {
    return decodeURIComponent(match.slice(CHAT_COOKIE.length + 1));
  } catch {
    return undefined; // Malformed: treated as no conversation.
  }
}

/** JSON response that is never cached (each visitor sees only their own chat). */
export function chatJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Scoped to the chat API, unreadable by scripts, sent only on same-site requests. */
export function setChatCookie(response: NextResponse, token: string) {
  response.cookies.set(CHAT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: getServerEnv().NODE_ENV === "production",
    path: "/api/chat",
    maxAge: CHAT_COOKIE_MAX_AGE,
  });
  return response;
}
