"use client";

import { SendIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useActionForm } from "@/components/admin/form/use-action-form";
import { useNotifications } from "@/components/admin/shell/notifications-provider";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/config/i18n";
import type { AdminMessages } from "@/i18n/admin";
import { formatDateTime } from "@/lib/format";
import { CHAT_MESSAGE_MAX } from "@/lib/validation/chat";
import { pollChatAction, replyToChatAction } from "@/server/actions/chats";
import type { StaffChatMessage } from "@/server/services/chat";
import { cn } from "@/lib/utils";

/** How often an open conversation checks for new visitor messages. */
const POLL_MS = 4000;

type Labels = Pick<AdminMessages, "common" | "validation" | "chats">;

/** Appends messages not already shown (a poll and a send can return the same one). */
const merge = (current: StaffChatMessage[], incoming: StaffChatMessage[]) => {
  const known = new Set(current.map((m) => m.id));
  return [...current, ...incoming.filter((m) => !known.has(m.id))];
};

/**
 * The conversation as chat bubbles: visitor on the left, staff on the right.
 * New messages arrive by polling while the tab is visible; replies are sent
 * with the button or Ctrl/⌘+Enter.
 */
export function ChatThread({
  id,
  initialMessages,
  initialStatus,
  visitorName,
  canReply,
  locale,
  labels,
}: {
  id: string;
  initialMessages: StaffChatMessage[];
  initialStatus: "OPEN" | "CLOSED";
  visitorName: string;
  canReply: boolean;
  locale: Locale;
  labels: Labels;
}) {
  const ch = labels.chats;
  const { refresh: refreshNotifications } = useNotifications();

  // Opening the chat marked it read on the server: clear the bell and badge now.
  useEffect(() => {
    refreshNotifications();
  }, [id, refreshNotifications]);
  const [messages, setMessages] = useState(initialMessages);
  const [status, setStatus] = useState(initialStatus);
  const list = useRef<HTMLOListElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const latest = messages.at(-1)?.createdAt;

  // A server refresh (after closing, reopening …) brings a newer list: adopt it.
  const [seen, setSeen] = useState(initialMessages);
  if (seen !== initialMessages) {
    setSeen(initialMessages);
    setMessages(initialMessages);
    setStatus(initialStatus);
  }

  useEffect(() => {
    if (!latest) return;
    let stopped = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      const result = await pollChatAction(id, latest);
      const data = result.ok ? result.data : undefined;
      if (stopped || !data) return;
      if (data.status) setStatus(data.status);
      if (data.messages.length) setMessages((current) => merge(current, data.messages));
    };
    const timer = window.setInterval(tick, POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [id, latest]);

  // Keep the newest message in view.
  useEffect(() => {
    list.current?.lastElementChild?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  const { onSubmit, pending, errorFor } = useActionForm(replyToChatAction.bind(null, id), labels, {
    onSuccess: async () => {
      form.current?.reset();
      if (latest) {
        const result = await pollChatAction(id, latest);
        const data = result.ok ? result.data : undefined;
        if (data) {
          setStatus("OPEN");
          setMessages((current) => merge(current, data.messages));
        }
      }
    },
  });
  const error = errorFor("body");

  return (
    <div className="grid gap-4">
      <ol
        ref={list}
        aria-live="polite"
        aria-label={ch.conversation}
        className="grid max-h-[60vh] min-h-48 content-start gap-3 overflow-y-auto rounded-md border bg-muted/30 p-4"
      >
        {messages.map((m) => {
          const staff = m.sender === "staff";
          return (
            <li key={m.id} className={cn("flex", staff ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm",
                  staff ? "bg-primary text-primary-foreground" : "border bg-card",
                )}
              >
                <p className="mb-1 text-xs font-medium opacity-80">
                  {staff ? (m.authorName ?? ch.staff) : visitorName}
                  <span className="font-normal">
                    {" · "}
                    <time dateTime={m.createdAt}>
                      {formatDateTime(new Date(m.createdAt), locale)}
                    </time>
                  </span>
                </p>
                <p className="wrap-anywhere whitespace-pre-wrap">{m.body}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {status === "CLOSED" ? (
        <p className="text-sm text-muted-foreground">{ch.closedNotice}</p>
      ) : null}

      {canReply ? (
        <form ref={form} onSubmit={onSubmit} noValidate className="grid gap-2">
          <label htmlFor="chat-reply" className="text-sm font-medium">
            {ch.reply}
          </label>
          <Textarea
            id="chat-reply"
            name="body"
            rows={3}
            maxLength={CHAT_MESSAGE_MAX}
            placeholder={ch.replyPlaceholder}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "chat-reply-error chat-reply-hint" : "chat-reply-hint"}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                form.current?.requestSubmit();
              }
            }}
          />
          {error ? (
            <p id="chat-reply-error" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p id="chat-reply-hint" className="text-xs text-muted-foreground">
              {ch.replyHint}
            </p>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner aria-hidden="true" /> : <SendIcon aria-hidden="true" />}
              {pending ? ch.sending : ch.send}
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">{ch.readOnly}</p>
      )}
    </div>
  );
}
