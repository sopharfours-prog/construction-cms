import "server-only";

import type { ProjectStatus, QuoteStatus } from "@/generated/prisma/client";
import { hasPermission } from "@/lib/auth/permissions";
import type { CurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { countUnreadChats, latestUnreadChatAt } from "@/server/services/chat";

const OPEN_QUOTE_STATUSES: QuoteStatus[] = ["NEW", "REVIEWING"];

/** Skip the query entirely when the user may not see the result. */
function when<T>(allowed: boolean, query: () => Promise<T>): Promise<T | null> {
  return allowed ? query() : Promise.resolve(null);
}

export type MonthlyRequests = { month: string; inquiries: number; quotes: number };

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

/**
 * Everything the dashboard shows, in parallel. Each block is null when the
 * user lacks the matching view permission: the data is never fetched.
 */
export async function getDashboardData(user: CurrentUser) {
  const can = (key: Parameters<typeof hasPermission>[1]) => hasPermission(user, key);
  const live = { deletedAt: null };

  const [
    projects,
    news,
    services,
    media,
    inquiries,
    quotes,
    monthly,
    latestQuotes,
    latestInquiries,
    activity,
  ] = await Promise.all([
    when(can("projects.view"), async () => {
      const byStatus = await db.project.groupBy({
        by: ["projectStatus"],
        where: live,
        _count: true,
      });
      const count = (s: ProjectStatus) => byStatus.find((r) => r.projectStatus === s)?._count ?? 0;
      return {
        total: byStatus.reduce((sum, r) => sum + r._count, 0),
        ongoing: count("ONGOING"),
        completed: count("COMPLETED"),
        upcoming: count("UPCOMING"),
      };
    }),
    when(can("news.view"), async () => {
      const [total, published] = await Promise.all([
        db.news.count({ where: live }),
        db.news.count({ where: { ...live, status: "PUBLISHED" } }),
      ]);
      return { total, published };
    }),
    when(can("services.view"), async () => {
      const [total, published] = await Promise.all([
        db.service.count({ where: live }),
        db.service.count({ where: { ...live, status: "PUBLISHED" } }),
      ]);
      return { total, published };
    }),
    when(can("media.view"), async () => {
      const agg = await db.media.aggregate({ where: live, _count: true, _sum: { size: true } });
      return { files: agg._count, bytes: agg._sum.size ?? 0 };
    }),
    when(can("inquiries.view"), () =>
      db.inquiry.count({ where: { status: "NEW", archivedAt: null } }),
    ),
    when(can("quotes.view"), () =>
      db.quoteRequest.count({ where: { status: { in: OPEN_QUOTE_STATUSES }, archivedAt: null } }),
    ),
    when(can("inquiries.view") || can("quotes.view"), () => monthlyRequests(user)),
    when(can("quotes.view"), () =>
      db.quoteRequest.findMany({
        where: { archivedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          referenceNumber: true,
          customerName: true,
          company: true,
          projectType: true,
          status: true,
          createdAt: true,
        },
      }),
    ),
    when(can("inquiries.view"), () =>
      db.inquiry.findMany({
        where: { archivedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, subject: true, status: true, createdAt: true },
      }),
    ),
    when(can("audit.view"), () =>
      db.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          action: true,
          entity: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      }),
    ),
  ]);

  return {
    projects,
    news,
    services,
    media,
    inquiries,
    quotes,
    monthly,
    latestQuotes,
    latestInquiries,
    activity,
  };
}

/**
 * Requests per calendar month (Asia/Vientiane) for the last 6 months,
 * including empty months, as one SQL round trip.
 */
async function monthlyRequests(user: CurrentUser): Promise<MonthlyRequests[]> {
  const rows = await db.$queryRaw<{ month: string; inquiries: number; quotes: number }[]>`
    WITH months AS (
      SELECT generate_series(
        date_trunc('month', (now() AT TIME ZONE 'Asia/Vientiane')) - interval '5 months',
        date_trunc('month', (now() AT TIME ZONE 'Asia/Vientiane')),
        interval '1 month'
      ) AS month
    )
    SELECT
      to_char(m.month, 'YYYY-MM') AS month,
      (SELECT count(*)::int FROM inquiries i
        WHERE date_trunc('month', (i.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Vientiane') = m.month) AS inquiries,
      (SELECT count(*)::int FROM quote_requests q
        WHERE date_trunc('month', (q.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Vientiane') = m.month) AS quotes
    FROM months m
    ORDER BY m.month`;

  return rows.map((r) => ({
    month: r.month,
    inquiries: hasPermission(user, "inquiries.view") ? Number(r.inquiries) : 0,
    quotes: hasPermission(user, "quotes.view") ? Number(r.quotes) : 0,
  }));
}

/** Header bell: requests nobody on staff has opened yet, in the queues this user can see. */
export async function getNotificationSummary(user: CurrentUser) {
  const [newInquiries, newQuotes, newChats, latestChatAt, pendingUsers] = await Promise.all([
    when(hasPermission(user, "inquiries.view"), () =>
      db.inquiry.count({ where: { staffReadAt: null, archivedAt: null } }),
    ),
    when(hasPermission(user, "quotes.view"), () =>
      db.quoteRequest.count({ where: { staffReadAt: null, archivedAt: null } }),
    ),
    // Open chats with a visitor message nobody has read yet.
    when(hasPermission(user, "chats.view"), countUnreadChats),
    // Lets the CMS alert only when a genuinely new message arrives.
    when(hasPermission(user, "chats.view"), latestUnreadChatAt),
    // Registration requests, for those who can approve them.
    when(hasPermission(user, "users.update"), () =>
      db.user.count({ where: { status: "PENDING", deletedAt: null, requestSeenAt: null } }),
    ),
  ]);
  return { newInquiries, newQuotes, newChats, latestChatAt: latestChatAt ?? null, pendingUsers };
}
