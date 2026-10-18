import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { CurrentUser } from "@/lib/auth/session";
import type { MailMessage } from "@/lib/mail/mailer";
import { allPermissions } from "@/lib/permissions/registry";

const sent: MailMessage[] = [];
vi.mock("@/lib/mail/mailer", () => ({
  sendMail: async (message: MailMessage) => {
    sent.push(message);
  },
}));

const { db } = await import("@/lib/db/client");
const { getServerEnv } = await import("@/lib/env/server");
const { createFormToken } = await import("@/lib/security/form-token");
const chat = await import("@/server/services/chat");

const request = { ipAddress: `198.51.100.${Math.floor(Math.random() * 200)}`, userAgent: "vitest" };
const token = () => createFormToken(getServerEnv().AUTH_SECRET, Date.now() - 10_000);
const created: string[] = [];
let ctx: { user: CurrentUser; request: typeof request };

let visitorCount = 0;
/** A new conversation from its own connection (the per-connection start limit is tested separately). */
async function begin(name = "Visitor", message = "Hello, I need a quote for a house.") {
  visitorCount++;
  const result = await chat.startConversation(
    { name, contact: "visitor@example.com", message, locale: "en", formToken: token() },
    { ...request, ipAddress: `192.0.2.${visitorCount}` },
  );
  if (result.spam) throw new Error("unexpected spam");
  created.push(result.id);
  return result;
}

beforeAll(async () => {
  await db.rateLimit.deleteMany({});
  const admin = await db.user.findFirstOrThrow({ where: { email: "admin@example.com" } });
  ctx = {
    user: {
      id: admin.id,
      name: "Admin",
      email: admin.email,
      avatarUrl: null,
      preferredLocale: null,
      role: { key: "SUPER_ADMIN", name: "S" },
      permissions: new Set(allPermissions.map((p) => p.key)),
    },
    request,
  };
});
afterAll(async () => {
  await db.chatConversation.deleteMany({ where: { id: { in: created } } });
  await db.$disconnect();
});

describe("live chat: visitor side", () => {
  it("starts a conversation with the first message and a secret token", async () => {
    const result = await begin();
    expect(result.token.length).toBeGreaterThan(30);
    expect(result.conversation.messages).toHaveLength(1);
    expect(result.conversation.messages[0]).toMatchObject({ sender: "visitor" });
    // Only the hash is stored.
    const row = await db.chatConversation.findUniqueOrThrow({ where: { id: result.id } });
    expect(row.visitorTokenHash).not.toBe(result.token);
    expect(row.visitorTokenHash).toHaveLength(64);
  });

  it("shows a visitor only their own conversation", async () => {
    const a = await begin("Alice", "Alice's question");
    const b = await begin("Bob", "Bob's question");
    const seenByA = await chat.getVisitorConversation(a.token);
    expect(seenByA?.messages.map((m) => m.body)).toEqual(["Alice's question"]);
    expect((await chat.getVisitorConversation(b.token))?.messages[0]?.body).toBe("Bob's question");
    expect(await chat.getVisitorConversation("not-a-real-token")).toBeNull();
    expect(await chat.getVisitorConversation(undefined)).toBeNull();
    await expect(chat.postVisitorMessage("not-a-real-token", "hi", request)).rejects.toMatchObject({
      code: "notFound",
    });
  });

  it("stores nothing for bots and rejects stale or missing form tokens", async () => {
    const before = await db.chatConversation.count();
    const bot = await chat.startConversation(
      {
        name: "Bot",
        contact: "bot@example.com",
        message: "spam",
        website: "http://x",
        formToken: token(),
      },
      request,
    );
    expect(bot).toEqual({ spam: true });
    await expect(
      chat.startConversation(
        { name: "X", contact: "x@example.com", message: "hi", formToken: "" },
        request,
      ),
    ).rejects.toMatchObject({ code: "validation", reason: "formExpired" });
    await expect(
      chat.startConversation(
        {
          name: "X",
          contact: "x@example.com",
          message: "hi",
          formToken: createFormToken(getServerEnv().AUTH_SECRET),
        },
        request,
      ),
    ).rejects.toMatchObject({ code: "validation", reason: "formTooFast" });
    expect(await db.chatConversation.count()).toBe(before);
  });

  it("limits new chats from one connection", async () => {
    const flood = { ...request, ipAddress: "192.0.2.250" };
    const results = [];
    for (let i = 0; i < 6; i++)
      results.push(
        await chat
          .startConversation(
            { name: "Flood", contact: "f@example.com", message: "hi", formToken: token() },
            flood,
          )
          .then(
            (r) => {
              if (!r.spam) created.push(r.id);
              return "ok";
            },
            (e: { code: string }) => e.code,
          ),
      );
    expect(results.slice(0, 5)).toEqual(["ok", "ok", "ok", "ok", "ok"]);
    expect(results[5]).toBe("rateLimited");
  });

  it("limits how fast one conversation can send messages", async () => {
    const { token: t } = await begin();
    const results = [];
    for (let i = 0; i < 21; i++)
      results.push(
        await chat.postVisitorMessage(t, `message ${i}`, request).then(
          () => "ok",
          (e) => e.code,
        ),
      );
    expect(results.slice(0, 20).every((r) => r === "ok")).toBe(true);
    expect(results[20]).toBe("rateLimited");
  });
});

describe("live chat: staff side", () => {
  it("delivers staff replies to the visitor without exposing who wrote them", async () => {
    const { id, token: t } = await begin();
    await chat.postStaffReply(id, "Thanks, we'll call you today.", ctx);
    const visitor = await chat.getVisitorConversation(t);
    expect(visitor?.messages.at(-1)).toMatchObject({
      sender: "staff",
      body: "Thanks, we'll call you today.",
    });
    expect(JSON.stringify(visitor)).not.toContain(ctx.user.email);
    // Staff see the author.
    const staff = await chat.getConversation(id);
    expect(staff?.messages.at(-1)?.authorName).toBeTruthy();
  });

  it("counts a chat as unread until a staff member opens it", async () => {
    const { id, token: t } = await begin();
    const unread = await chat.countUnreadChats();
    expect(unread).toBeGreaterThan(0);
    await chat.getConversation(id);
    expect(await chat.countUnreadChats()).toBe(unread - 1);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await chat.postVisitorMessage(t, "Are you there?", request);
    expect(await chat.countUnreadChats()).toBe(unread);
  });

  it("closes, reopens when the visitor writes again, and audits staff actions", async () => {
    const { id, token: t } = await begin();
    await chat.setConversationStatus(id, "CLOSED", ctx);
    expect((await chat.getVisitorConversation(t))?.status).toBe("CLOSED");
    await chat.postVisitorMessage(t, "One more question", request);
    expect((await chat.getVisitorConversation(t))?.status).toBe("OPEN");
    const actions = await db.auditLog.findMany({
      where: { entity: "ChatConversation", entityId: id },
      select: { action: true },
    });
    expect(actions.map((a) => a.action)).toContain("STATUS_CHANGE");
  });

  it("assigns only to staff who can reply", async () => {
    const { id } = await begin();
    await chat.assignConversation(id, ctx.user.id, ctx);
    expect((await chat.getConversation(id))?.assignedToId).toBe(ctx.user.id);
    const viewer = await db.user.findFirst({
      where: { role: { key: "VIEWER" }, status: "ACTIVE", deletedAt: null },
    });
    if (viewer)
      await expect(chat.assignConversation(id, viewer.id, ctx)).rejects.toMatchObject({
        field: "assigneeId",
      });
  });

  it("deletes a conversation with its messages, and the visitor's link stops working", async () => {
    const { id, token: t } = await begin();
    await chat.deleteConversation(id, ctx);
    expect(await db.chatMessage.count({ where: { conversationId: id } })).toBe(0);
    expect(await chat.getVisitorConversation(t)).toBeNull();
    expect(
      await db.auditLog.count({
        where: { entity: "ChatConversation", entityId: id, action: "DELETE" },
      }),
    ).toBe(1);
  });

  it("emails the company about a new chat with a link to it", async () => {
    const { id } = await begin();
    await chat.notifyNewConversation(id, "Visitor", "Hello");
    const contact = await db.setting.findUnique({ where: { key: "contact" } });
    if (contact) expect(sent.at(-1)?.text).toContain(`/admin/chats/${id}`);
  });
});
