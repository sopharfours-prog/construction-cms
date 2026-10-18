import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { AdminPageHeader } from "@/components/admin/page-header";
import { RequestControls } from "@/components/admin/requests/request-controls";
import { RequestConversation } from "@/components/admin/requests/request-conversation";
import {
  AttachmentList,
  ContactLinks,
  Details,
  NoteTimeline,
} from "@/components/admin/requests/request-parts";
import { StatusBadge } from "@/components/admin/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isLocale, localeConfig } from "@/config/i18n";
import { NotificationsSync } from "@/components/admin/shell/notifications-sync";
import { getAdminMessages } from "@/i18n/admin";
import { markRequestRead } from "@/server/services/notifications";
import { getAdminLocale } from "@/i18n/admin-locale";
import { hasPermission, requirePermission } from "@/lib/auth/session";
import { formatDateTime, formatNumber } from "@/lib/format";
import { addRequestNoteAction, replyToRequestAction } from "@/server/actions/requests";
import { listAssignableStaff, quoteStatuses } from "@/server/services/requests/common";
import { getQuote } from "@/server/services/requests/queries";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getAdminMessages(await getAdminLocale()).quotes.detailTitle };
}

export default async function QuotePage({ params }: PageProps<"/admin/quotes/[id]">) {
  const user = await requirePermission("quotes.view");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const locale = await getAdminLocale();
  const t = getAdminMessages(locale);
  const r = t.requests;
  const q = t.quotes;
  const [quote, staff] = await Promise.all([getQuote(id, locale), listAssignableStaff("quote")]);
  if (!quote) notFound();
  // Opened by staff: no longer unread (leaves the bell; the status is unchanged).
  await markRequestRead("quote", quote.id);
  const canUpdate = hasPermission(user, "quotes.update");
  const dateOnly = (d: Date | null) =>
    d
      ? new Intl.DateTimeFormat(locale === "lo" ? "lo-LA" : "en-GB", {
          dateStyle: "long",
          timeZone: "UTC",
        }).format(d)
      : null;

  return (
    <>
      <NotificationsSync />
      <AdminPageHeader
        title={`${quote.referenceNumber} · ${quote.customerName}`}
        description={`${q.detailTitle} · ${formatDateTime(quote.createdAt, locale)}`}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="grid content-start gap-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">{q.fields.description}</CardTitle>
              <StatusBadge
                kind="quote"
                status={quote.status}
                label={t.status.quote[quote.status]}
              />
            </CardHeader>
            <CardContent className="grid gap-6">
              <Details
                rows={[
                  [
                    q.reference,
                    <span key="ref" className="font-mono">
                      {quote.referenceNumber}
                    </span>,
                  ],
                  [q.fields.service, quote.service?.title ?? null],
                  [q.fields.projectType, quote.projectType],
                  [q.fields.location, quote.location],
                  [
                    q.fields.budget,
                    quote.budget
                      ? `${formatNumber(Number(quote.budget), locale)} ${quote.currency}`
                      : null,
                  ],
                  [q.fields.startDate, dateOnly(quote.expectedStartDate)],
                ]}
              />
              <p
                className="border-t pt-4 text-sm break-words whitespace-pre-wrap"
                lang={quote.locale ?? undefined}
              >
                {quote.description}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{r.attachments}</CardTitle>
            </CardHeader>
            <CardContent>
              <AttachmentList
                base={`/api/quotes/${quote.id}`}
                attachments={quote.attachments}
                locale={locale}
                labels={r}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{r.notes}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              {canUpdate ? (
                <RequestConversation
                  noteAction={addRequestNoteAction.bind(null, "quote", quote.id)}
                  replyAction={replyToRequestAction.bind(null, "quote", quote.id)}
                  email={quote.email}
                  defaultSubject={`${quote.referenceNumber}: ${quote.projectType}`}
                  labels={t}
                />
              ) : null}
              <NoteTimeline notes={quote.notes} locale={locale} labels={r} />
            </CardContent>
          </Card>
        </div>
        <div className="grid content-start gap-6">
          <Card>
            <CardContent>
              <RequestControls
                kind="quote"
                id={quote.id}
                status={quote.status}
                statuses={quoteStatuses.map((s) => ({ value: s, label: t.status.quote[s] }))}
                assigneeId={quote.assignedToId}
                staff={staff}
                archived={Boolean(quote.archivedAt)}
                can={{ update: canUpdate, delete: hasPermission(user, "quotes.delete") }}
                itemLabel={`${quote.referenceNumber} · ${quote.customerName}`}
                labels={t}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{r.contact}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Details
                rows={[
                  [q.columns.customer, quote.customerName],
                  [r.company, quote.company],
                  [r.email, quote.email],
                  [r.phone, quote.phone],
                  [
                    r.language,
                    quote.locale && isLocale(quote.locale)
                      ? localeConfig[quote.locale].nativeName
                      : null,
                  ],
                  ...(quote.archivedAt
                    ? ([[r.archivedOn, formatDateTime(quote.archivedAt, locale)]] as [
                        string,
                        string,
                      ][])
                    : []),
                ]}
              />
              <ContactLinks email={quote.email} phone={quote.phone} labels={r} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
