"use client";

import { useEffect } from "react";

import { useNotifications } from "./notifications-provider";

/**
 * Placed on a page that marks something read on the server (opening an
 * inquiry, a quote, an account request): updates the bell straight away.
 */
export function NotificationsSync() {
  const { refresh } = useNotifications();
  useEffect(() => {
    refresh();
  }, [refresh]);
  return null;
}
