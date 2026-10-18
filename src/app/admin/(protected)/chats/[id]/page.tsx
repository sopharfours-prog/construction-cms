import { MailIcon, PhoneIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { ChatControls } from "@/components/admin/chats/chat-controls";
import { ChatThread } from "@/components/admin/chats/chat-thread";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Details } from "@/components/admin/requests/request-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { localeConfig } from "@/config/i18n";
import { getAdminMessages } from "@/i18n/admin";
import { getAdminLocale } from "@/i18n/admin-locale";
import { hasPermission, requirePermission } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { getConversation, listChatStaff } from "@/server/services/chat";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getAdminMessages(await getAdminLocale()).chats.detailTitle };
}

export default async function ChatPage({ params }: PageProps<"/admin/chats/[id]">) {
  const user = await requirePermission("chats.view");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const locale = await getAdminLocale();
  const t = getAdminMessages(locale);
  const ch = t.chats;
  const [conversation, staff] = await Promise.all([getConversation(id), listChatStaff()]);
  if (!conversation) notFound();

  const canReply = hasPermission(user, "chats.reply");
  const isEmail = conversation.visitorContact.includes("@");

  return (
    <>
      <AdminPageHeader
        title={conversation.visitorName}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {ch.detailTitle} · {formatDateTime(conversation.createdAt, locale)}
            <Badge variant={conversation.status === "OPEN" ? "info" : "secondary"}>
              {ch.status[conversation.status]}
            </Badge>
          </span>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{ch.conversation}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChatThread
              id={conversation.id}
              initialMessages={conversation.messages}
              initialStatus={conversation.status}
              visitorName={conversation.visitorName}
              canReply={canReply}
              locale={locale}
              labels={t}
            />
          </CardContent>
        </Card>
        <div className="grid content-start gap-6">
          <Card>
            <CardContent>
              <ChatControls
                id={conversation.id}
                status={conversation.status}
                assigneeId={conversation.assignedToId}
                staff={staff}
                can={{ reply: canReply, delete: hasPermission(user, "chats.delete") }}
                visitorName={conversation.visitorName}
                labels={t}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{ch.visitor}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Details
                rows={[
                  [ch.name, conversation.visitorName],
                  [ch.contact, conversation.visitorContact],
                  [ch.language, localeConfig[conversation.locale].nativeName],
                  [ch.started, formatDateTime(conversation.createdAt, locale)],
                  ...(conversation.closedAt
                    ? ([[ch.closedOn, formatDateTime(conversation.closedAt, locale)]] as [
                        string,
                        string,
                      ][])
                    : []),
                ]}
              />
              <p className="text-xs text-muted-foreground">{ch.followUpHint}</p>
              <div>
                <Button asChild variant="outline" size="sm">
                  {isEmail ? (
                    <a href={`mailto:${conversation.visitorContact}`}>
                      <MailIcon aria-hidden="true" />
                      {ch.emailVisitor}
                    </a>
                  ) : (
                    <a href={`tel:${conversation.visitorContact.replace(/[^+0-9]/g, "")}`}>
                      <PhoneIcon aria-hidden="true" />
                      {ch.callVisitor}
                    </a>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
