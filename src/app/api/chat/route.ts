import { after } from "next/server";

import { apiError, publicRoute } from "@/lib/api/route";
import { chatStartSchema } from "@/lib/validation/chat";
import {
  getVisitorConversation,
  isChatOpen,
  notifyNewConversation,
  startConversation,
} from "@/server/services/chat";

import { chatJson, chatToken, setChatCookie } from "./http";

/**
 * GET /api/chat?after=<ISO time> — the visitor's own conversation (from the
 * cookie), or only messages newer than `after`. `{ conversation: null }` when
 * this browser has none. Polled by the chat bubble.
 */
export async function GET(request: Request) {
  if (!isChatOpen()) return apiError("notFound");
  const afterParam = new URL(request.url).searchParams.get("after");
  const after = afterParam ? new Date(afterParam) : undefined;
  if (after && Number.isNaN(after.getTime())) return apiError("validation");
  return chatJson({ conversation: await getVisitorConversation(chatToken(request), after) });
}

/** POST /api/chat — start a conversation: { name, contact, message, locale, website, formToken }. */
export const POST = publicRoute(async (request, info) => {
  if (!isChatOpen()) return apiError("notFound");
  const input = chatStartSchema.parse(await request.json().catch(() => ({})));
  const result = await startConversation(input, info);
  // Honeypot: answer like a success, but there is no conversation and no cookie.
  if (result.spam) return chatJson({ conversation: { status: "OPEN", messages: [] } }, 201);
  after(() => notifyNewConversation(result.id, input.name, input.message));
  return setChatCookie(chatJson({ conversation: result.conversation }, 201), result.token);
});
