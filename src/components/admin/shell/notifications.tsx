"use client";

import {
  BellIcon,
  CheckCheckIcon,
  FileSpreadsheetIcon,
  InboxIcon,
  MessagesSquareIcon,
  UserPlusIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { markAllNotificationsReadAction } from "@/server/actions/notifications";

import { useNotifications } from "./notifications-provider";

export type NotificationSummary = {
  newInquiries: number | null;
  newQuotes: number | null;
  newChats: number | null;
  /** Newest unread chat message (ISO time), to alert only on genuinely new ones. */
  latestChatAt: string | null;
  pendingUsers: number | null;
};

type NotificationsProps = {
  summary: NotificationSummary;
  labels: {
    notifications: string;
    notificationsEmpty: string;
    newInquiries: string;
    newQuotes: string;
    newChats: string;
    pendingUsers: string;
    markAllRead: string;
  };
};

/**
 * Counts of unhandled customer requests. A count is null when the user lacks
 * the permission to see that queue, and the row is then omitted.
 */
/** The bell. Counts come from <NotificationsProvider>, which keeps them current. */
export function Notifications({ labels }: Omit<NotificationsProps, "summary">) {
  const { summary, refresh } = useNotifications();
  const [pending, start] = useTransition();
  const rows = [
    {
      key: "chats",
      href: "/admin/chats?status=OPEN",
      icon: MessagesSquareIcon,
      label: labels.newChats,
      count: summary.newChats,
    },
    {
      key: "users",
      href: "/admin/users?status=PENDING",
      icon: UserPlusIcon,
      label: labels.pendingUsers,
      count: summary.pendingUsers,
    },
    {
      key: "quotes",
      href: "/admin/quotes",
      icon: FileSpreadsheetIcon,
      label: labels.newQuotes,
      count: summary.newQuotes,
    },
    {
      key: "inquiries",
      href: "/admin/inquiries",
      icon: InboxIcon,
      label: labels.newInquiries,
      count: summary.newInquiries,
    },
  ].filter((row): row is typeof row & { count: number } => row.count !== null && row.count > 0);
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <>
      {/* Announced when the count changes (polling), next to the bell, not inside its label. */}
      <span className="sr-only" aria-live="polite">
        {total > 0 ? `${labels.notifications}: ${total}` : ""}
      </span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={total > 0 ? `${labels.notifications} (${total})` : labels.notifications}
          >
            <BellIcon aria-hidden="true" />
            {total > 0 ? (
              <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-semibold text-destructive-foreground tabular-nums">
                {total > 99 ? "99+" : total}
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-0">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
            <p className="py-1 text-sm font-semibold">{labels.notifications}</p>
            {total > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const result = await markAllNotificationsReadAction();
                    if (result.ok) await refresh();
                  })
                }
              >
                <CheckCheckIcon aria-hidden="true" />
                {labels.markAllRead}
              </Button>
            ) : null}
          </div>
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {labels.notificationsEmpty}
            </p>
          ) : (
            <ul className="py-1">
              {rows.map((row) => (
                <li key={row.key}>
                  <Link
                    href={row.href as Route}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent"
                  >
                    <row.icon className="size-4 text-muted-foreground" aria-hidden="true" />
                    <span className="flex-1">{row.label}</span>
                    <span className="font-semibold tabular-nums">{row.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </PopoverContent>
      </Popover>
    </>
  );
}
