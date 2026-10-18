import { apiError, publicRoute } from "@/lib/api/route";
import { chatMessageSchema } from "@/lib/validation/chat";
import { isChatOpen, postVisitorMessage } from "@/server/services/chat";

import { chatJson, chatToken } from "../http";

/** POST /api/chat/messages — a further visitor message: { body }. */
export const POST = publicRoute(async (request, info) => {
  if (!isChatOpen()) return apiError("notFound");
  const { body } = chatMessageSchema.parse(await request.json().catch(() => ({})));
  return chatJson({ message: await postVisitorMessage(chatToken(request), body, info) }, 201);
});
