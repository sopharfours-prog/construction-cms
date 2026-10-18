import "server-only";

import type { CurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db/client";

/**
 * Read state behind the notification bell. An inquiry, quote request, chat or
 * staff account request stays in the bell until someone on staff opens it
 * (read state is shared by the team); its workflow status is not touched.
 */

export async function markRequestRead(kind: "inquiry" | "quote", id: string) {
  const where = { id, staffReadAt: null };
  const data = { staffReadAt: new Date() };
  if (kind === "inquiry") await db.inquiry.updateMany({ where, data });
  else await db.quoteRequest.updateMany({ where, data });
}

/** A staff account request opened by an administrator leaves the bell (it stays pending). */
export async function markAccountRequestSeen(id: string) {
  await db.user.updateMany({
    where: { id, status: "PENDING", requestSeenAt: null },
    data: { requestSeenAt: new Date() },
  });
}

/** "Mark all as read": every queue this person can see in the bell. */
export async function markAllNotificationsRead(user: CurrentUser) {
  const now = new Date();
  await Promise.all([
    hasPermission(user, "inquiries.view")
      ? db.inquiry.updateMany({
          where: { staffReadAt: null, archivedAt: null },
          data: { staffReadAt: now },
        })
      : null,
    hasPermission(user, "quotes.view")
      ? db.quoteRequest.updateMany({
          where: { staffReadAt: null, archivedAt: null },
          data: { staffReadAt: now },
        })
      : null,
    // Chats: read means nobody has to look at the visitor's latest message any more.
    hasPermission(user, "chats.view")
      ? db.chatConversation.updateMany({ where: { status: "OPEN" }, data: { staffReadAt: now } })
      : null,
    hasPermission(user, "users.update")
      ? db.user.updateMany({
          where: { status: "PENDING", deletedAt: null, requestSeenAt: null },
          data: { requestSeenAt: now },
        })
      : null,
  ]);
  return { id: user.id };
}
