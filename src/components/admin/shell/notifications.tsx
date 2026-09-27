"use client";

import { BellIcon, FileSpreadsheetIcon, InboxIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type NotificationSummary = { newInquiries: number | null; newQuotes: number | null };

type NotificationsProps = {
  summary: NotificationSummary;
  labels: {
    notifications: string;
    notificationsEmpty: string;
    newInquiries: string;
    newQuotes: string;
  };
};

/**
 * Counts of unhandled customer requests. A count is null when the user lacks
 * the permission to see that queue, and the row is then omitted.
 */
export function Notifications({ summary, labels }: NotificationsProps) {
  const rows = [
    { key: "quotes", icon: FileSpreadsheetIcon, label: labels.newQuotes, count: summary.newQuotes },
    { key: "inquiries", icon: InboxIcon, label: labels.newInquiries, count: summary.newInquiries },
  ].filter((row): row is typeof row & { count: number } => row.count !== null && row.count > 0);
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return (
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
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-semibold text-white tabular-nums">
              {total > 99 ? "99+" : total}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <p className="border-b px-4 py-3 text-sm font-semibold">{labels.notifications}</p>
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            {labels.notificationsEmpty}
          </p>
        ) : (
          <ul className="py-1">
            {rows.map((row) => (
              <li key={row.key} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <row.icon className="size-4 text-muted-foreground" aria-hidden="true" />
                <span className="flex-1">{row.label}</span>
                <span className="font-semibold tabular-nums">{row.count}</span>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
