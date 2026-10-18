"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions";
import { chatMessageSchema } from "@/lib/validation/chat";
import {
  assignConversation,
  deleteConversation,
  getConversation,
  postStaffReply,
  setConversationStatus,
} from "@/server/services/chat";

import { runAction } from "./run";

const refresh = (id?: string) => {
  revalidatePath("/admin/chats");
  if (id) revalidatePath(`/admin/chats/${id}`);
};

/** Messages newer than `after`, for the open conversation screen (polled). */
export async function pollChatAction(id: string, after: string) {
  return runAction(
    "chats.view",
    z.object({ id: z.uuid(), after: z.iso.datetime() }),
    { id, after },
    async (d) => {
      const conversation = await getConversation(d.id, new Date(d.after));
      return conversation
        ? { status: conversation.status, messages: conversation.messages }
        : { status: null, messages: [] };
    },
  );
}

export async function replyToChatAction(
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
) {
  const r = await runAction("chats.reply", chatMessageSchema, formData, (d, ctx) =>
    postStaffReply(z.uuid().parse(id), d.body, ctx),
  );
  if (r.ok) refresh(id);
  return r;
}

export async function setChatStatusAction(id: string, status: "OPEN" | "CLOSED") {
  const r = await runAction(
    "chats.reply",
    z.object({ id: z.uuid(), status: z.enum(["OPEN", "CLOSED"]) }),
    { id, status },
    (d, ctx) => setConversationStatus(d.id, d.status, ctx),
  );
  if (r.ok) refresh(id);
  return r;
}

export async function assignChatAction(id: string, assigneeId: string | null) {
  const r = await runAction(
    "chats.reply",
    z.object({ id: z.uuid(), assigneeId: z.uuid().nullable() }),
    { id, assigneeId },
    (d, ctx) => assignConversation(d.id, d.assigneeId, ctx),
  );
  if (r.ok) refresh(id);
  return r;
}

export async function deleteChatAction(id: string) {
  const r = await runAction("chats.delete", z.object({ id: z.uuid() }), { id }, (d, ctx) =>
    deleteConversation(d.id, ctx),
  );
  if (r.ok) refresh();
  return r;
}
