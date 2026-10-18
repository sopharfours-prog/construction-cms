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
import { localeConfig, isLocale } from "@/config/i18n";
import { NotificationsSync } from "@/components/admin/shell/notifications-sync";
import { getAdminMessages } from "@/i18n/admin";
import { markRequestRead } from "@/server/services/notifications";
import { getAdminLocale } from "@/i18n/admin-locale";
import { hasPermission, requirePermission } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { addRequestNoteAction, replyToRequestAction } from "@/server/actions/requests";
import { inquiryStatuses, listAssignableStaff } from "@/server/services/requests/common";
import { getInquiry } from "@/server/services/requests/queries";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getAdminMessages(await getAdminLocale()).inquiries.detailTitle };
}

export default async function InquiryPage({ params }: PageProps<"/admin/inquiries/[id]">) {
  const user = await requirePermission("inquiries.view");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const locale = await getAdminLocale();
  const t = getAdminMessages(locale);
  const r = t.requests;
  const [inquiry, staff] = await Promise.all([getInquiry(id), listAssignableStaff("inquiry")]);
  if (!inquiry) notFound();
  // Opened by staff: no longer unread (leaves the bell; the status is unchanged).
  await markRequestRead("inquiry", inquiry.id);
  const canUpdate = hasPermission(user, "inquiries.update");

  return (
    <>
      <NotificationsSync />
      <AdminPageHeader
        title={inquiry.subject}
        description={`${t.inquiries.detailTitle} · ${formatDateTime(inquiry.createdAt, locale)}`}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="grid content-start gap-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">{r.message}</CardTitle>
              <StatusBadge
                kind="inquiry"
                status={inquiry.status}
                label={t.status.inquiry[inquiry.status]}
              />
            </CardHeader>
            <CardContent>
              <p
                className="text-sm break-words whitespace-pre-wrap"
                lang={inquiry.locale ?? undefined}
              >
                {inquiry.message}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{r.attachments}</CardTitle>
            </CardHeader>
            <CardContent>
              <AttachmentList
                base={`/api/inquiries/${inquiry.id}`}
                attachments={inquiry.attachments}
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
                  noteAction={addRequestNoteAction.bind(null, "inquiry", inquiry.id)}
                  replyAction={replyToRequestAction.bind(null, "inquiry", inquiry.id)}
                  email={inquiry.email}
                  defaultSubject={`Re: ${inquiry.subject}`}
                  labels={t}
                />
              ) : null}
              <NoteTimeline notes={inquiry.notes} locale={locale} labels={r} />
            </CardContent>
          </Card>
        </div>
        <div className="grid content-start gap-6">
          <Card>
            <CardContent>
              <RequestControls
                kind="inquiry"
                id={inquiry.id}
                status={inquiry.status}
                statuses={inquiryStatuses.map((s) => ({ value: s, label: t.status.inquiry[s] }))}
                assigneeId={inquiry.assignedToId}
                staff={staff}
                archived={Boolean(inquiry.archivedAt)}
                can={{ update: canUpdate, delete: hasPermission(user, "inquiries.delete") }}
                itemLabel={`${inquiry.name}: ${inquiry.subject}`}
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
                  [r.columns.from, inquiry.name],
                  [r.email, inquiry.email],
                  [r.phone, inquiry.phone],
                  [r.company, inquiry.company],
                  [
                    r.language,
                    inquiry.locale && isLocale(inquiry.locale)
                      ? localeConfig[inquiry.locale].nativeName
                      : null,
                  ],
                  ...(inquiry.archivedAt
                    ? ([[r.archivedOn, formatDateTime(inquiry.archivedAt, locale)]] as [
                        string,
                        string,
                      ][])
                    : []),
                ]}
              />
              <ContactLinks email={inquiry.email} phone={inquiry.phone} labels={r} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
