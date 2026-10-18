"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { NotificationSummary } from "./notifications";

/** How often the counts are checked while the tab is visible. */
const POLL_MS = 15_000;

type Context = { summary: NotificationSummary; refresh: () => Promise<void> };
const NotificationsContext = createContext<Context | null>(null);

/** The bell's counts, for the bell and the sidebar badges. */
export function useNotifications() {
  const value = useContext(NotificationsContext);
  if (!value) throw new Error("useNotifications needs <NotificationsProvider>");
  return value;
}

/**
 * One source of truth for every notification in the CMS: the bell, the "Live
 * chat" badge in the sidebar and the new-message alert. Starts from the
 * server's counts, polls while the tab is visible, and alerts only when a
 * genuinely new chat message arrives (not on page load, not for old ones).
 */
export function NotificationsProvider({
  initial,
  labels,
  children,
}: {
  initial: NotificationSummary;
  labels: { newChatMessage: string; open: string };
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [summary, setSummary] = useState(initial);
  // A server render (navigation, router.refresh()) brings fresh counts: adopt them.
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setSummary(initial);
  }

  // Newest unread message already known about; anything newer gets an alert.
  const known = useRef(initial.latestChatAt);
  useEffect(() => {
    const latest = summary.latestChatAt;
    if (!latest || (known.current && latest <= known.current)) return;
    known.current = latest;
    toast.info(labels.newChatMessage, {
      id: "new-chat-message",
      action: {
        label: labels.open,
        onClick: () => router.push("/admin/chats?status=OPEN" as Route),
      },
    });
  }, [summary.latestChatAt, labels, router]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.ok) setSummary((await res.json()) as NotificationSummary);
    } catch {
      // Offline for a moment: keep the last counts.
    }
  }, []);

  useEffect(() => {
    const check = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = window.setInterval(check, POLL_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [refresh]);

  return (
    <NotificationsContext.Provider value={{ summary, refresh }}>
      {children}
    </NotificationsContext.Provider>
  );
}
