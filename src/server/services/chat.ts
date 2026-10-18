import "server-only";

import { siteConfig } from "@/config/site";
import { defaultLocale, isLocale, type Locale } from "@/config/i18n";
import type { Prisma } from "@/generated/prisma/client";
import { pageParam, paginate } from "@/lib/admin/list-params";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db/client";
import { getServerEnv } from "@/lib/env/server";
import { sendMail } from "@/lib/mail/mailer";
import { checkFormToken } from "@/lib/security/form-token";
import type { RequestInfo } from "@/lib/security/request-info";
import { generateToken, sha256 } from "@/lib/security/tokens";
import type { ChatStartInput } from "@/lib/validation/chat";
import { writeAuditLog } from "@/server/services/audit";
import { type ActionContext, ContentError } from "@/server/services/errors";
import { consumeRateLimit, rateLimitKey, rateLimits } from "@/server/services/rate-limit";
import { getSetting } from "@/server/services/settings";
import { z } from "zod";

/** httpOnly cookie holding the visitor's conversation token (never readable by scripts). */
export const CHAT_COOKIE = "chat_session";
/** How long a visitor's browser keeps its conversation. */
export const CHAT_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;
/** Messages returned to the visitor at most (the newest ones). */
const VISITOR_HISTORY = 200;

export type ChatMessageView = {
  id: string;
  sender: "visitor" | "staff";
  body: string;
  createdAt: string;
};
export type VisitorConversation = {
  status: "OPEN" | "CLOSED";
  messages: ChatMessageView[];
};

const messageView = (m: {
  id: string;
  sender: "VISITOR" | "STAFF";
  body: string;
  createdAt: Date;
}) =>
  ({
    id: m.id,
    sender: m.sender === "VISITOR" ? "visitor" : "staff",
    body: m.body,
    createdAt: m.createdAt.toISOString(),
  }) satisfies ChatMessageView;

const findByToken = (token: string | undefined) =>
  token && token.length <= 100
    ? db.chatConversation.findUnique({ where: { visitorTokenHash: sha256(token) } })
    : null;

async function limit(key: string, rule: (typeof rateLimits)[keyof typeof rateLimits]) {
  const result = await consumeRateLimit(key, rule);
  if (!result.allowed)
    throw new ApiError("rateLimited", undefined, {
      "Retry-After": String(result.retryAfterSeconds),
    });
}

// ─── Visitor side ────────────────────────────────────────────────────────────

/**
 * Start a conversation from the chat bubble. Same spam defences as the
 * contact form: honeypot (looks successful, stores nothing), signed form
 * token, per-connection limit. Returns the visitor's secret token, which the
 * route handler puts in an httpOnly cookie.
 */
export async function startConversation(
  input: ChatStartInput,
  request: RequestInfo,
): Promise<
  { spam: true } | { spam: false; token: string; id: string; conversation: VisitorConversation }
> {
  if (input.website) return { spam: true };
  const formToken = checkFormToken(input.formToken, getServerEnv().AUTH_SECRET);
  if (formToken === "tooFast") throw new ApiError("validation", "formTooFast");
  if (formToken !== "ok") throw new ApiError("validation", "formExpired");
  await limit(
    rateLimitKey("chat-start:ip", request.ipAddress ?? "unknown"),
    rateLimits.chatStartPerIp,
  );

  const token = generateToken();
  const locale = input.locale && isLocale(input.locale) ? input.locale : defaultLocale;
  const conversation = await db.chatConversation.create({
    data: {
      visitorName: input.name,
      visitorContact: input.contact,
      visitorTokenHash: sha256(token),
      locale,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent?.slice(0, 512) ?? null,
      messages: { create: { sender: "VISITOR", body: input.message } },
    },
    include: { messages: true },
  });
  return {
    spam: false,
    token,
    id: conversation.id,
    conversation: { status: "OPEN", messages: conversation.messages.map(messageView) },
  };
}

/** The visitor's own conversation (by cookie token); null when there is none. */
export async function getVisitorConversation(
  token: string | undefined,
  after?: Date,
): Promise<VisitorConversation | null> {
  const conversation = await findByToken(token);
  if (!conversation) return null;
  const messages = await db.chatMessage.findMany({
    where: { conversationId: conversation.id, ...(after ? { createdAt: { gt: after } } : {}) },
    orderBy: { createdAt: "desc" },
    take: VISITOR_HISTORY,
  });
  return { status: conversation.status, messages: messages.reverse().map(messageView) };
}

/** A further visitor message. Writing into a closed chat reopens it. */
export async function postVisitorMessage(
  token: string | undefined,
  body: string,
  request: RequestInfo,
): Promise<ChatMessageView> {
  const conversation = await findByToken(token);
  if (!conversation) throw new ApiError("notFound");
  await limit(
    rateLimitKey("chat-msg:ip", request.ipAddress ?? "unknown"),
    rateLimits.chatMessagesPerIp,
  );
  await limit(
    rateLimitKey("chat-msg:conv", conversation.id),
    rateLimits.chatMessagesPerConversation,
  );

  const now = new Date();
  const [message] = await db.$transaction([
    db.chatMessage.create({ data: { conversationId: conversation.id, sender: "VISITOR", body } }),
    db.chatConversation.update({
      where: { id: conversation.id },
      data: { lastVisitorMessageAt: now, lastMessageAt: now, status: "OPEN", closedAt: null },
    }),
  ]);
  return messageView(message);
}

/** Best effort email to the company's notification address about a new chat. */
export async function notifyNewConversation(id: string, name: string, message: string) {
  try {
    const contact = await getSetting("contact");
    const to = contact?.notificationEmail ?? contact?.email;
    if (!to) return;
    await sendMail({
      to,
      subject: `ແຊັດໃໝ່ຈາກເວັບໄຊ / New website chat: ${name.replace(/[\r\n]+/g, " ")}`,
      text: [
        "ມີລູກຄ້າເລີ່ມແຊັດຢູ່ເວັບໄຊ. A visitor started a chat on the website.",
        "",
        message.slice(0, 500),
        "",
        `${siteConfig.url}/admin/chats/${id}`,
      ].join("\n"),
    });
  } catch (error) {
    console.error("[chat] notification email failed", error);
  }
}

// ─── Staff side ──────────────────────────────────────────────────────────────

export const chatListSchema = z.object({
  page: pageParam,
  status: z.enum(["OPEN", "CLOSED"]).optional().catch(undefined),
});
export type ChatListFilters = z.infer<typeof chatListSchema>;

/** Open conversations with a visitor message nobody on staff has opened yet. */
const unreadChatWhere = () => ({
  status: "OPEN" as const,
  OR: [
    { staffReadAt: null },
    { staffReadAt: { lt: db.chatConversation.fields.lastVisitorMessageAt } },
  ],
});

export function countUnreadChats() {
  return db.chatConversation.count({ where: unreadChatWhere() });
}

/** When the newest unread visitor message arrived (null when nothing is unread). */
export async function latestUnreadChatAt(): Promise<string | null> {
  const row = await db.chatConversation.aggregate({
    where: unreadChatWhere(),
    _max: { lastVisitorMessageAt: true },
  });
  return row._max.lastVisitorMessageAt?.toISOString() ?? null;
}

export async function listConversations(filters: ChatListFilters) {
  const where: Prisma.ChatConversationWhereInput = filters.status ? { status: filters.status } : {};
  const total = await db.chatConversation.count({ where });
  const { page, pageCount, skip, take } = paginate(total, filters.page);
  const rows = await db.chatConversation.findMany({
    where,
    orderBy: [{ status: "desc" }, { lastMessageAt: "desc" }],
    skip,
    take,
    select: {
      id: true,
      visitorName: true,
      visitorContact: true,
      status: true,
      locale: true,
      lastMessageAt: true,
      lastVisitorMessageAt: true,
      staffReadAt: true,
      assignedTo: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, sender: true } },
    },
  });
  return {
    rows: rows.map(({ messages, ...row }) => ({
      ...row,
      unread:
        row.status === "OPEN" && (!row.staffReadAt || row.staffReadAt < row.lastVisitorMessageAt),
      lastMessage: messages[0] ?? null,
    })),
    total,
    page,
    pageCount,
  };
}

export type StaffChatMessage = ChatMessageView & { authorName: string | null };

/** One conversation for staff. Opening it marks the visitor's messages as read. */
export async function getConversation(id: string, after?: Date) {
  const conversation = await db.chatConversation.findUnique({
    where: { id },
    select: {
      id: true,
      visitorName: true,
      visitorContact: true,
      status: true,
      locale: true,
      assignedToId: true,
      createdAt: true,
      closedAt: true,
      lastVisitorMessageAt: true,
      staffReadAt: true,
    },
  });
  if (!conversation) return null;
  const messages = await db.chatMessage.findMany({
    where: { conversationId: id, ...(after ? { createdAt: { gt: after } } : {}) },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      sender: true,
      body: true,
      createdAt: true,
      author: { select: { name: true } },
    },
  });
  if (!conversation.staffReadAt || conversation.staffReadAt < conversation.lastVisitorMessageAt)
    await db.chatConversation.update({ where: { id }, data: { staffReadAt: new Date() } });
  return {
    ...conversation,
    locale: (conversation.locale && isLocale(conversation.locale)
      ? conversation.locale
      : defaultLocale) as Locale,
    messages: messages.map((m): StaffChatMessage => ({
      ...messageView(m),
      authorName: m.author?.name ?? null,
    })),
  };
}

async function loadConversation(id: string) {
  const conversation = await db.chatConversation.findUnique({ where: { id } });
  if (!conversation) throw new ContentError("notFound");
  return conversation;
}

/** Staff reply. Replying reopens a closed chat and counts as reading it. */
export async function postStaffReply(id: string, body: string, ctx: ActionContext) {
  await loadConversation(id);
  const now = new Date();
  const [message] = await db.$transaction([
    db.chatMessage.create({
      data: { conversationId: id, sender: "STAFF", authorId: ctx.user.id, body },
    }),
    db.chatConversation.update({
      where: { id },
      data: { lastMessageAt: now, staffReadAt: now, status: "OPEN", closedAt: null },
    }),
  ]);
  await writeAuditLog({
    action: "UPDATE",
    entity: "ChatConversation",
    entityId: id,
    userId: ctx.user.id,
    newValue: { replyId: message.id },
    request: ctx.request,
  });
  return { id: message.id };
}

export async function setConversationStatus(
  id: string,
  status: "OPEN" | "CLOSED",
  ctx: ActionContext,
) {
  const conversation = await loadConversation(id);
  if (conversation.status === status) return { id };
  await db.chatConversation.update({
    where: { id },
    data: { status, closedAt: status === "CLOSED" ? new Date() : null },
  });
  await writeAuditLog({
    action: "STATUS_CHANGE",
    entity: "ChatConversation",
    entityId: id,
    userId: ctx.user.id,
    oldValue: { status: conversation.status },
    newValue: { status },
    request: ctx.request,
  });
  return { id };
}

/** Staff who can answer chats: active accounts whose role holds chats.reply. */
export function listChatStaff() {
  return db.user.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      role: { permissions: { some: { permission: { key: "chats.reply" } } } },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function assignConversation(
  id: string,
  assigneeId: string | null,
  ctx: ActionContext,
) {
  const conversation = await loadConversation(id);
  if (assigneeId && !(await listChatStaff()).some((u) => u.id === assigneeId))
    throw new ContentError("validation", "assigneeId", "assigneeInvalid");
  if (conversation.assignedToId === assigneeId) return { id };
  await db.chatConversation.update({ where: { id }, data: { assignedToId: assigneeId } });
  await writeAuditLog({
    action: "UPDATE",
    entity: "ChatConversation",
    entityId: id,
    userId: ctx.user.id,
    oldValue: { assignedToId: conversation.assignedToId },
    newValue: { assignedToId: assigneeId },
    request: ctx.request,
  });
  return { id };
}

/** Permanently removes the conversation and its messages. */
export async function deleteConversation(id: string, ctx: ActionContext) {
  const conversation = await loadConversation(id);
  const messages = await db.chatMessage.count({ where: { conversationId: id } });
  await db.chatConversation.delete({ where: { id } });
  await writeAuditLog({
    action: "DELETE",
    entity: "ChatConversation",
    entityId: id,
    userId: ctx.user.id,
    oldValue: {
      visitorName: conversation.visitorName,
      visitorContact: conversation.visitorContact,
      messages,
    },
    request: ctx.request,
  });
  return { id };
}

/** Off with ALLOW_CHAT=false: the bubble disappears and the endpoints answer 404. */
export function isChatOpen(): boolean {
  return process.env.ALLOW_CHAT !== "false";
}
