import { afterAll, describe, expect, it } from "vitest";

import type { CurrentUser } from "@/lib/auth/session";
import type { PermissionKey } from "@/lib/permissions/registry";

const { db } = await import("@/lib/db/client");
const { getNotificationSummary } = await import("@/server/services/dashboard");
const { markAllNotificationsRead, markRequestRead } =
  await import("@/server/services/notifications");

const as = (permissions: PermissionKey[]): CurrentUser => ({
  id: "00000000-0000-7000-8000-000000000000",
  name: "Test",
  email: "test@example.com",
  avatarUrl: null,
  preferredLocale: null,
  role: { key: "TEST", name: "Test" },
  permissions: new Set(permissions),
});

afterAll(async () => {
  await db.$disconnect();
});

describe("notification bell", () => {
  it("counts exactly the queues waiting for someone", async () => {
    const all = await getNotificationSummary(
      as(["inquiries.view", "quotes.view", "chats.view", "users.update"]),
    );
    expect(all).toEqual({
      newInquiries: await db.inquiry.count({ where: { staffReadAt: null, archivedAt: null } }),
      newQuotes: await db.quoteRequest.count({ where: { staffReadAt: null, archivedAt: null } }),
      newChats: expect.any(Number),
      latestChatAt: expect.toBeOneOf([null, expect.any(String)]),
      pendingUsers: await db.user.count({
        where: { status: "PENDING", deletedAt: null, requestSeenAt: null },
      }),
    });
  });

  it("shows each queue only to roles that can open it", async () => {
    // A project editor sees no customer queues and no account requests.
    expect(await getNotificationSummary(as(["projects.view", "projects.update"]))).toEqual({
      newInquiries: null,
      newQuotes: null,
      newChats: null,
      latestChatAt: null,
      pendingUsers: null,
    });
    // Reading users is not enough to see requests: approving them needs users.update.
    const viewer = await getNotificationSummary(as(["inquiries.view", "users.view"]));
    expect(viewer.newInquiries).toEqual(expect.any(Number));
    expect(viewer.pendingUsers).toBeNull();
    expect(viewer.newChats).toBeNull();
  });

  it("counts a chat as unanswered until staff open it", async () => {
    const before = (await getNotificationSummary(as(["chats.view"]))).newChats!;
    const chat = await db.chatConversation.create({
      data: {
        visitorName: "Bell test",
        visitorContact: "bell@example.com",
        visitorTokenHash: `bell-${Math.random()}`.padEnd(64, "0").slice(0, 64),
        messages: { create: { sender: "VISITOR", body: "Hello" } },
      },
    });
    try {
      expect((await getNotificationSummary(as(["chats.view"]))).newChats).toBe(before + 1);
      await db.chatConversation.update({
        where: { id: chat.id },
        data: { staffReadAt: new Date() },
      });
      expect((await getNotificationSummary(as(["chats.view"]))).newChats).toBe(before);
    } finally {
      await db.chatConversation.delete({ where: { id: chat.id } });
    }
  });

  it("removes an inquiry from the bell once opened, without changing its status", async () => {
    const reader = as(["inquiries.view"]);
    const before = (await getNotificationSummary(reader)).newInquiries!;
    const inquiry = await db.inquiry.create({
      data: {
        name: "Bell",
        email: "bell@example.com",
        subject: "Bell test",
        message: "Testing the bell.",
      },
    });
    try {
      expect((await getNotificationSummary(reader)).newInquiries).toBe(before + 1);
      await markRequestRead("inquiry", inquiry.id);
      expect((await getNotificationSummary(reader)).newInquiries).toBe(before);
      const row = await db.inquiry.findUniqueOrThrow({ where: { id: inquiry.id } });
      expect(row.status).toBe("NEW");
      expect(row.staffReadAt).not.toBeNull();
    } finally {
      await db.inquiry.delete({ where: { id: inquiry.id } });
    }
  });

  it("marks as read only the queues the person can see", async () => {
    const inquiry = await db.inquiry.create({
      data: {
        name: "Bell",
        email: "bell@example.com",
        subject: "Scope test",
        message: "Testing scope.",
      },
    });
    try {
      // A project editor's "Mark all as read" must not touch inquiries.
      await markAllNotificationsRead(as(["projects.view"]));
      expect(
        (await db.inquiry.findUniqueOrThrow({ where: { id: inquiry.id } })).staffReadAt,
      ).toBeNull();
    } finally {
      await db.inquiry.delete({ where: { id: inquiry.id } });
    }
  });
});
