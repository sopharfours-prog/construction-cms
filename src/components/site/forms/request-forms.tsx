"use client";

import { CheckCircle2Icon, CircleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { Locale } from "@/config/i18n";
import { fmt } from "@/i18n/format";
import type { Messages } from "@/i18n/messages";
import { ATTACHMENT_LIMITS, inquiryInputSchema, quoteInputSchema } from "@/lib/validation/requests";

import { AttachmentField, Honeypot, SelectField, TextAreaField, TextField } from "./fields";
import { type Status, usePublicForm } from "./use-public-form";

type F = Messages["public"]["form"];

function StatusBanner({
  status,
  f,
  onReset,
  successText,
}: {
  status: Status;
  f: F;
  onReset: () => void;
  successText: string;
}) {
  if (status.state === "success") {
    return (
      <div
        role="status"
        className="grid justify-items-start gap-4 border-l-4 border-success bg-success/10 p-6"
      >
        <CheckCircle2Icon className="size-8 text-success" aria-hidden="true" />
        <h2 className="text-2xl type-heading">{f.successTitle}</h2>
        <p className="text-base leading-relaxed">{successText}</p>
        <Button variant="outline" onClick={onReset}>
          {f.sendAnother}
        </Button>
      </div>
    );
  }
  return null;
}

function ErrorBanner({
  status,
  hasFieldErrors,
  f,
}: {
  status: Status;
  hasFieldErrors: boolean;
  f: F;
}) {
  const text =
    status.state === "error" && status.message
      ? status.message
      : hasFieldErrors
        ? f.errorSummary
        : null;
  if (!text) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 border-l-4 border-destructive bg-destructive/10 p-4 text-sm"
    >
      <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
      {text}
    </p>
  );
}

export function ContactForm({ locale, f }: { locale: Locale; f: F }) {
  const form = usePublicForm({
    endpoint: "/api/inquiries",
    schema: inquiryInputSchema,
    locale,
    errors: f.errors,
    maxFiles: ATTACHMENT_LIMITS.inquiry,
  });
  const e = form.fieldErrors;
  if (form.status.state === "success")
    return (
      <StatusBanner status={form.status} f={f} onReset={form.reset} successText={f.successText} />
    );
  const sending = form.status.state === "sending";
  return (
    <form onSubmit={form.onSubmit} noValidate className="relative grid gap-5" aria-busy={sending}>
      <Honeypot />
      <ErrorBanner status={form.status} hasFieldErrors={Object.keys(e).length > 0} f={f} />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField
          name="name"
          label={f.name}
          error={e.name}
          required
          autoComplete="name"
          maxLength={120}
        />
        <TextField
          name="email"
          type="email"
          label={f.email}
          error={e.email}
          required
          autoComplete="email"
          maxLength={254}
        />
        <TextField
          name="phone"
          type="tel"
          label={f.phone}
          error={e.phone}
          optionalLabel={f.optional}
          autoComplete="tel"
          maxLength={40}
        />
        <TextField
          name="company"
          label={f.company}
          error={e.company}
          optionalLabel={f.optional}
          autoComplete="organization"
          maxLength={160}
        />
      </div>
      <TextField name="subject" label={f.subject} error={e.subject} required maxLength={200} />
      <TextAreaField
        name="message"
        label={f.message}
        error={e.message}
        required
        maxLength={5000}
        rows={6}
      />
      <AttachmentField
        files={form.files}
        onAdd={form.addFiles}
        onRemove={form.removeFile}
        error={e.attachments}
        labels={f}
        maxFiles={ATTACHMENT_LIMITS.inquiry}
      />
      <p className="text-xs text-muted-foreground">{f.privacy}</p>
      <Button type="submit" size="lg" className="w-full sm:w-fit" disabled={sending}>
        {sending ? <Spinner aria-hidden="true" /> : null}
        {sending ? f.sending : f.submit}
      </Button>
    </form>
  );
}

export function QuoteForm({
  locale,
  f,
  services,
}: {
  locale: Locale;
  f: F;
  services: { slug: string; id: string; title: string }[];
}) {
  const form = usePublicForm({
    endpoint: "/api/quotes",
    schema: quoteInputSchema,
    locale,
    errors: f.errors,
    maxFiles: ATTACHMENT_LIMITS.quote,
  });
  const e = form.fieldErrors;
  if (form.status.state === "success") {
    const text = form.status.reference
      ? fmt(f.successQuote, { reference: form.status.reference })
      : f.successQuoteNoRef;
    return <StatusBanner status={form.status} f={f} onReset={form.reset} successText={text} />;
  }
  const sending = form.status.state === "sending";
  return (
    <form onSubmit={form.onSubmit} noValidate className="relative grid gap-5" aria-busy={sending}>
      <Honeypot />
      <ErrorBanner status={form.status} hasFieldErrors={Object.keys(e).length > 0} f={f} />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField
          name="customerName"
          label={f.customerName}
          error={e.customerName}
          required
          autoComplete="name"
          maxLength={120}
        />
        <TextField
          name="company"
          label={f.company}
          error={e.company}
          optionalLabel={f.optional}
          autoComplete="organization"
          maxLength={160}
        />
        <TextField
          name="email"
          type="email"
          label={f.email}
          error={e.email}
          required
          autoComplete="email"
          maxLength={254}
        />
        <TextField
          name="phone"
          type="tel"
          label={f.phone}
          error={e.phone}
          required
          autoComplete="tel"
          maxLength={40}
        />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <SelectField
          name="serviceId"
          label={f.service}
          error={e.serviceId}
          optionalLabel={f.optional}
          options={[
            { value: "", label: f.chooseService },
            ...services.map((s) => ({ value: s.id, label: s.title })),
          ]}
        />
        <TextField
          name="projectType"
          label={f.projectType}
          error={e.projectType}
          required
          placeholder={f.projectTypePlaceholder}
          maxLength={160}
        />
        <TextField name="location" label={f.location} error={e.location} required maxLength={200} />
        <TextField
          name="expectedStartDate"
          type="date"
          label={f.startDate}
          error={e.expectedStartDate}
          optionalLabel={f.optional}
        />
      </div>
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <TextField
          name="estimatedBudget"
          inputMode="decimal"
          label={f.budget}
          error={e.estimatedBudget}
          optionalLabel={f.optional}
          placeholder="1,500,000,000"
          maxLength={24}
        />
        <SelectField
          name="currency"
          label={f.currency}
          options={["LAK", "USD", "THB"].map((c) => ({ value: c, label: c }))}
          defaultValue="LAK"
        />
      </div>
      <TextAreaField
        name="description"
        label={f.description}
        error={e.description}
        required
        maxLength={5000}
        rows={7}
      />
      <AttachmentField
        files={form.files}
        onAdd={form.addFiles}
        onRemove={form.removeFile}
        error={e.attachments}
        labels={f}
        maxFiles={ATTACHMENT_LIMITS.quote}
      />
      <p className="text-xs text-muted-foreground">{f.privacy}</p>
      <Button type="submit" size="lg" className="w-full sm:w-fit" disabled={sending}>
        {sending ? <Spinner aria-hidden="true" /> : null}
        {sending ? f.sending : f.submitQuote}
      </Button>
    </form>
  );
}
