"use client";

import { MailIcon, StickyNoteIcon } from "lucide-react";
import { useRef } from "react";

import { FormField } from "@/components/admin/form/form-field";
import { useActionForm } from "@/components/admin/form/use-action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { AdminMessages } from "@/i18n/admin";
import { fmt } from "@/i18n/format";
import type { ActionResult } from "@/lib/actions";

type Action = (
  prev: ActionResult<{ id: string }> | null,
  fd: FormData,
) => Promise<ActionResult<{ id: string }>>;
type Labels = Pick<AdminMessages, "common" | "validation" | "requests">;

function NoteForm({ action, labels }: { action: Action; labels: Labels }) {
  const form = useRef<HTMLFormElement>(null);
  const { onSubmit, pending, errorFor } = useActionForm(action, labels, {
    successMessage: labels.common.toast.saved,
    onSuccess: () => form.current?.reset(),
  });
  return (
    <form ref={form} onSubmit={onSubmit} noValidate className="grid gap-3">
      <FormField
        id="note-body"
        label={labels.requests.addNote}
        hint={labels.requests.notesHint}
        error={errorFor("body")}
      >
        {(a) => (
          <Textarea
            {...a}
            name="body"
            rows={3}
            maxLength={5000}
            placeholder={labels.requests.notePlaceholder}
          />
        )}
      </FormField>
      <Button type="submit" size="sm" className="w-fit" disabled={pending}>
        {pending ? <Spinner aria-hidden="true" /> : null}
        {pending ? labels.common.saving : labels.requests.addNote}
      </Button>
    </form>
  );
}

function ReplyForm({
  action,
  email,
  defaultSubject,
  labels,
}: {
  action: Action;
  email: string;
  defaultSubject: string;
  labels: Labels;
}) {
  const form = useRef<HTMLFormElement>(null);
  const r = labels.requests;
  const { onSubmit, pending, errorFor } = useActionForm(action, labels, {
    successMessage: r.sent,
    onSuccess: () => {
      const body = form.current?.elements.namedItem("body");
      if (body instanceof HTMLTextAreaElement) body.value = "";
    },
  });
  return (
    <form ref={form} onSubmit={onSubmit} noValidate className="grid gap-3">
      <p className="text-xs text-muted-foreground">{fmt(r.replyHint, { email })}</p>
      <FormField id="reply-subject" label={r.replySubject} error={errorFor("subject")}>
        {(a) => <Input {...a} name="subject" defaultValue={defaultSubject} maxLength={200} />}
      </FormField>
      <FormField id="reply-body" label={r.replyBody} error={errorFor("body")}>
        {(a) => <Textarea {...a} name="body" rows={6} maxLength={10000} />}
      </FormField>
      <Button type="submit" size="sm" className="w-fit" disabled={pending}>
        {pending ? <Spinner aria-hidden="true" /> : <MailIcon aria-hidden="true" />}
        {pending ? r.sending : r.send}
      </Button>
    </form>
  );
}

/** Tabs: internal note / email reply. */
export function RequestConversation(props: {
  noteAction: Action;
  replyAction?: Action;
  email: string;
  defaultSubject: string;
  labels: Labels;
}) {
  const r = props.labels.requests;
  if (!props.replyAction) return <NoteForm action={props.noteAction} labels={props.labels} />;
  return (
    <Tabs defaultValue="note">
      <TabsList>
        <TabsTrigger value="note" className="gap-1.5">
          <StickyNoteIcon className="size-4" aria-hidden="true" />
          {r.addNote}
        </TabsTrigger>
        <TabsTrigger value="reply" className="gap-1.5">
          <MailIcon className="size-4" aria-hidden="true" />
          {r.reply}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="note" className="pt-3">
        <NoteForm action={props.noteAction} labels={props.labels} />
      </TabsContent>
      <TabsContent value="reply" className="pt-3">
        <ReplyForm
          action={props.replyAction}
          email={props.email}
          defaultSubject={props.defaultSubject}
          labels={props.labels}
        />
      </TabsContent>
    </Tabs>
  );
}
