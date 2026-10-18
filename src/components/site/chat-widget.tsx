"use client";

import { MessageCircleIcon, SendIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/config/i18n";
import type { Messages } from "@/i18n/messages";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CHAT_MESSAGE_MAX, chatMessageSchema, chatStartSchema } from "@/lib/validation/chat";

type ChatMessage = { id: string; sender: "visitor" | "staff"; body: string; createdAt: string };
type Conversation = { status: "OPEN" | "CLOSED"; messages: ChatMessage[] };
type Labels = Messages["public"]["chat"];
type Errors = Messages["public"]["form"]["errors"];

/** Replies arrive this often while the window is open, and for the unread badge while it is closed. */
const POLL_OPEN_MS = 4000;
const POLL_CLOSED_MS = 30000;
/** The server treats a form token younger than 3 s as automated. */
const MIN_TOKEN_AGE_MS = 3500;
/** Per-browser conveniences only; the conversation itself is behind an httpOnly cookie. */
const ACTIVE_KEY = "chat:active";
const SEEN_KEY = "chat:seen";

const store = {
  get: (key: string) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string | null) => {
    try {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch {
      // Private mode or blocked storage: the chat still works, just without the badge.
    }
  },
};

const merge = (current: ChatMessage[], incoming: ChatMessage[]) => {
  const known = new Set(current.map((m) => m.id));
  return [...current, ...incoming.filter((m) => !known.has(m.id))];
};

/**
 * The chat bubble on every public page. A visitor leaves a name, an email or
 * phone number and a first message; staff answer from Live chat in the CMS.
 */
export function ChatWidget({
  locale,
  companyName,
  labels,
  errors,
}: {
  locale: Locale;
  companyName: string;
  labels: Labels;
  errors: Errors;
}) {
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const token = useRef<{ value: string; loadedAt: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const composer = useRef<HTMLFormElement>(null);
  const titleId = useId();
  const panelId = useId();

  const messages = conversation?.messages ?? [];
  const started = conversation !== null;
  const latest = messages.at(-1)?.createdAt;

  const message = (key: string | undefined) =>
    key && key in errors ? errors[key as keyof Errors] : errors.invalid;

  /** Staff replies the visitor hasn't seen (counted while the window is closed). */
  const countUnread = useCallback((list: ChatMessage[]) => {
    const seen = store.get(SEEN_KEY);
    const index = seen ? list.findIndex((m) => m.id === seen) : -1;
    return list.slice(index + 1).filter((m) => m.sender === "staff").length;
  }, []);

  const fetchConversation = useCallback(async (after?: string) => {
    const query = after ? `?after=${encodeURIComponent(after)}` : "";
    const res = await fetch(`/api/chat${query}`, { cache: "no-store" });
    if (!res.ok) return undefined;
    return ((await res.json()) as { conversation: Conversation | null }).conversation;
  }, []);

  // Returning visitor: restore their conversation (the cookie says whose it is).
  useEffect(() => {
    if (store.get(ACTIVE_KEY) !== "1") return;
    let cancelled = false;
    void fetchConversation().then((found) => {
      if (cancelled || found === undefined) return;
      if (found === null) store.set(ACTIVE_KEY, null);
      setConversation(found);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchConversation]);

  // New replies: often while open, rarely while closed, never in a background tab.
  useEffect(() => {
    if (!conversation || !latest) return;
    let stopped = false;
    const timer = window.setInterval(
      async () => {
        if (document.visibilityState !== "visible") return;
        const update = await fetchConversation(latest).catch(() => undefined);
        if (stopped || !update) return;
        setConversation((current) =>
          current
            ? { status: update.status, messages: merge(current.messages, update.messages) }
            : current,
        );
      },
      open ? POLL_OPEN_MS : POLL_CLOSED_MS,
    );
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [conversation, latest, open, fetchConversation]);

  // Everything shown while the window is open counts as seen.
  const lastId = messages.at(-1)?.id;
  useEffect(() => {
    if (open && lastId) store.set(SEEN_KEY, lastId);
  }, [open, lastId]);
  const unread = open || !conversation ? 0 : countUnread(conversation.messages);

  // Keep the newest message in view.
  useEffect(() => {
    if (open) list.current?.lastElementChild?.scrollIntoView({ block: "nearest" });
  }, [open, messages.length]);

  const loadToken = useCallback(async () => {
    try {
      const res = await fetch("/api/form-token", { cache: "no-store" });
      token.current = res.ok
        ? { value: ((await res.json()) as { token: string }).token, loadedAt: Date.now() }
        : null;
    } catch {
      token.current = null;
    }
  }, []);

  // The start form needs a fresh anti-spam token.
  useEffect(() => {
    if (open && !conversation) void loadToken();
  }, [open, conversation, loadToken]);

  // Focus the first field on open; Escape closes and returns focus to the button.
  useEffect(() => {
    if (!open) return;
    // The first visible field (never the hidden anti-spam one).
    panel.current?.querySelector<HTMLElement>("#chat-name, #chat-body")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, started]);

  const failed = async (res: Response) => {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      reason?: string;
      issues?: Record<string, string>;
    };
    if (body.issues) {
      setFieldErrors(
        Object.fromEntries(Object.entries(body.issues).map(([k, v]) => [k, message(v)])),
      );
      return;
    }
    if (body.error === "rateLimited") return setError(errors.rateLimited);
    if (body.reason === "formExpired" || body.reason === "formTooFast") {
      await loadToken();
      return setError(errors.formExpired);
    }
    setError(errors.unexpected);
  };

  async function start(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const parsed = chatStartSchema.safeParse({ ...data, locale });
    setError(null);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues)
        next[String(issue.path[0])] ??= message(issue.message);
      setFieldErrors(next);
      form.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }
    setFieldErrors({});
    setSending(true);
    try {
      if (!token.current) await loadToken();
      const wait = MIN_TOKEN_AGE_MS - (Date.now() - (token.current?.loadedAt ?? 0));
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, locale, formToken: token.current?.value }),
      });
      if (!res.ok) return await failed(res);
      const { conversation: created } = (await res.json()) as { conversation: Conversation };
      store.set(ACTIVE_KEY, "1");
      const last = created.messages.at(-1);
      if (last) store.set(SEEN_KEY, last.id);
      setConversation(created);
    } catch {
      setError(errors.unexpected);
    } finally {
      setSending(false);
    }
  }

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const parsed = chatMessageSchema.safeParse({ body: new FormData(form).get("body") });
    setError(null);
    if (!parsed.success) return;
    setSending(true);
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (res.status === 404) {
        // The conversation is gone (deleted by staff, or cookie expired): start again.
        store.set(ACTIVE_KEY, null);
        setConversation(null);
        return;
      }
      if (!res.ok) return await failed(res);
      const { message: sent } = (await res.json()) as { message: ChatMessage };
      form.reset();
      setConversation((current) =>
        current ? { status: "OPEN", messages: merge(current.messages, [sent]) } : current,
      );
    } catch {
      setError(errors.unexpected);
    } finally {
      setSending(false);
    }
  }

  const fieldProps = (name: string) => ({
    id: `chat-${name}`,
    name,
    "aria-invalid": fieldErrors[name] ? true : undefined,
    "aria-describedby": fieldErrors[name] ? `chat-${name}-error` : undefined,
  });
  const fieldError = (name: string) =>
    fieldErrors[name] ? (
      <p id={`chat-${name}-error`} className="text-xs text-destructive">
        {fieldErrors[name]}
      </p>
    ) : null;

  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {open ? (
        <div
          ref={panel}
          id={panelId}
          role="dialog"
          aria-labelledby={titleId}
          className="flex h-[min(34rem,calc(100dvh-6rem))] w-[min(23rem,calc(100vw-2rem))] flex-col border bg-background shadow-xl"
        >
          <div className="flex items-start justify-between gap-3 bg-brand px-4 py-3 text-brand-foreground">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base type-heading">
                {labels.title}
              </h2>
              <p className="text-xs text-brand-foreground/80">{labels.subtitle}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={labels.close}
              className="shrink-0 text-brand-foreground hover:bg-brand-foreground/10 hover:text-brand-foreground"
              onClick={() => {
                setOpen(false);
                button.current?.focus();
              }}
            >
              <XIcon aria-hidden="true" />
            </Button>
          </div>

          {conversation ? (
            <>
              <ol
                ref={list}
                aria-live="polite"
                aria-label={labels.title}
                className="grid flex-1 content-start gap-3 overflow-y-auto bg-muted/40 p-4"
              >
                {messages.map((m) => {
                  const mine = m.sender === "visitor";
                  return (
                    <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[85%] px-3 py-2 text-sm",
                          mine ? "bg-primary text-primary-foreground" : "border bg-card",
                        )}
                      >
                        <p className="mb-0.5 text-xs opacity-80">
                          {mine ? labels.you : companyName}
                          {" · "}
                          <time dateTime={m.createdAt}>
                            {formatDateTime(new Date(m.createdAt), locale)}
                          </time>
                        </p>
                        <p className="wrap-anywhere whitespace-pre-wrap">{m.body}</p>
                      </div>
                    </li>
                  );
                })}
                {messages.every((m) => m.sender === "visitor") ? (
                  <li className="text-center text-xs text-muted-foreground">{labels.waiting}</li>
                ) : null}
              </ol>
              {conversation.status === "CLOSED" ? (
                <p className="border-t px-4 py-2 text-xs text-muted-foreground">
                  {labels.closedNotice}
                </p>
              ) : null}
              <form ref={composer} onSubmit={send} className="grid gap-2 border-t p-3">
                {error ? (
                  <p role="alert" className="text-xs text-destructive">
                    {error}
                  </p>
                ) : null}
                <div className="flex items-end gap-2">
                  <label htmlFor="chat-body" className="sr-only">
                    {labels.message}
                  </label>
                  <Textarea
                    id="chat-body"
                    name="body"
                    rows={2}
                    maxLength={CHAT_MESSAGE_MAX}
                    placeholder={labels.placeholder}
                    className="min-h-0 flex-1 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        composer.current?.requestSubmit();
                      }
                    }}
                  />
                  <Button type="submit" size="icon" disabled={sending} aria-label={labels.send}>
                    {sending ? <Spinner aria-hidden="true" /> : <SendIcon aria-hidden="true" />}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <form
              onSubmit={start}
              noValidate
              className="grid flex-1 content-start gap-3 overflow-y-auto p-4"
            >
              <p className="text-sm text-muted-foreground">{labels.intro}</p>
              {/* Bots fill every field; people never see this one. */}
              <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
                <label>
                  Website
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="chat-name" className="text-sm font-medium">
                  {labels.name}
                </label>
                <Input {...fieldProps("name")} autoComplete="name" maxLength={120} />
                {fieldError("name")}
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="chat-contact" className="text-sm font-medium">
                  {labels.contact}
                </label>
                <Input {...fieldProps("contact")} autoComplete="email" maxLength={254} />
                {fieldError("contact")}
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="chat-message" className="text-sm font-medium">
                  {labels.message}
                </label>
                <Textarea {...fieldProps("message")} rows={3} maxLength={CHAT_MESSAGE_MAX} />
                {fieldError("message")}
              </div>
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <Button type="submit" disabled={sending} className="w-full">
                {sending ? <Spinner aria-hidden="true" /> : null}
                {sending ? labels.starting : labels.start}
              </Button>
              <p className="text-xs text-muted-foreground">{labels.privacy}</p>
            </form>
          )}
        </div>
      ) : null}

      <Button
        ref={button}
        type="button"
        size="lg"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="relative h-12 gap-2 bg-brand px-4 text-brand-foreground shadow-lg hover:bg-brand/90"
      >
        {open ? <XIcon aria-hidden="true" /> : <MessageCircleIcon aria-hidden="true" />}
        <span className={cn(open && "sr-only sm:not-sr-only")}>
          {open ? labels.close : labels.open}
        </span>
        {unread > 0 && !open ? (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-semibold text-destructive-foreground tabular-nums">
            {unread}
            <span className="sr-only"> {labels.unread}</span>
          </span>
        ) : null}
      </Button>
    </div>
  );
}
