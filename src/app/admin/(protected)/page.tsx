import {
  CircleCheckIcon,
  FileSpreadsheetIcon,
  HardDriveIcon,
  HardHatIcon,
  InboxIcon,
  NewspaperIcon,
  TimerIcon,
  WrenchIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ProjectStatusChart, RequestsChart } from "@/components/admin/dashboard/charts";
import { StatCard } from "@/components/admin/dashboard/stat-card";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminContentSkeleton } from "@/components/admin/page-skeleton";
import { StatusBadge } from "@/components/admin/status-badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAdminMessages } from "@/i18n/admin";
import { getAdminLocale } from "@/i18n/admin-locale";
import { fmt } from "@/i18n/format";
import { type CurrentUser, hasPermission, requirePermission } from "@/lib/auth/session";
import type { Locale } from "@/config/i18n";
import { formatBytes, formatNumber, formatRelative } from "@/lib/format";
import { getDashboardData } from "@/server/services/dashboard";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getAdminMessages(await getAdminLocale()).dashboard.title };
}

export default async function DashboardPage() {
  const user = await requirePermission("dashboard.view");
  const locale = await getAdminLocale();
  const d = getAdminMessages(locale).dashboard;

  return (
    <>
      <AdminPageHeader title={fmt(d.greeting, { name: user.name })} description={d.subtitle} />
      <Suspense fallback={<AdminContentSkeleton variant="dashboard" />}>
        <DashboardContent user={user} locale={locale} />
      </Suspense>
    </>
  );
}

async function DashboardContent({ user, locale }: { user: CurrentUser; locale: Locale }) {
  const t = getAdminMessages(locale);
  const d = t.dashboard;
  const data = await getDashboardData(user);
  const n = (value: number) => formatNumber(value, locale);

  const stats = [
    data.projects && {
      label: d.stats.totalProjects,
      value: n(data.projects.total),
      icon: HardHatIcon,
    },
    data.projects && {
      label: d.stats.activeProjects,
      value: n(data.projects.ongoing),
      icon: TimerIcon,
    },
    data.projects && {
      label: d.stats.completedProjects,
      value: n(data.projects.completed),
      icon: CircleCheckIcon,
    },
    data.news && {
      label: d.stats.totalNews,
      value: n(data.news.total),
      hint: fmt(d.stats.published, { count: n(data.news.published) }),
      icon: NewspaperIcon,
    },
    data.services && {
      label: d.stats.totalServices,
      value: n(data.services.total),
      hint: fmt(d.stats.published, { count: n(data.services.published) }),
      icon: WrenchIcon,
    },
    data.inquiries !== null && {
      label: d.stats.newInquiries,
      value: n(data.inquiries),
      hint: d.stats.awaitingReply,
      icon: InboxIcon,
      emphasis: data.inquiries > 0,
    },
    data.quotes !== null && {
      label: d.stats.openQuotes,
      value: n(data.quotes),
      hint: d.stats.needsAction,
      icon: FileSpreadsheetIcon,
      emphasis: data.quotes > 0,
    },
    data.media && {
      label: d.stats.mediaStorage,
      value: formatBytes(data.media.bytes, locale),
      hint: fmt(d.stats.files, { count: n(data.media.files) }),
      icon: HardDriveIcon,
    },
  ].filter((s) => Boolean(s)) as React.ComponentProps<typeof StatCard>[];

  return (
    <>
      {stats.length > 0 ? (
        <section
          aria-label={d.title}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </section>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        {data.monthly ? (
          <Card className="xl:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">{d.requestsChart}</CardTitle>
            </CardHeader>
            <CardContent>
              <RequestsChart
                data={data.monthly}
                locale={locale}
                labels={{
                  inquiries: d.inquiries,
                  quotes: d.quotes,
                  empty: d.noChartData,
                  title: d.requestsChart,
                }}
              />
            </CardContent>
          </Card>
        ) : null}
        {data.projects ? (
          <Card className={data.monthly ? "xl:col-span-2" : "xl:col-span-5"}>
            <CardHeader>
              <CardTitle className="text-base">{d.projectsChart}</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectStatusChart
                label={d.projects}
                data={(["ONGOING", "UPCOMING", "COMPLETED"] as const).map((key) => ({
                  key,
                  label: t.status.project[key],
                  value: data.projects![key.toLowerCase() as "ongoing" | "upcoming" | "completed"],
                }))}
              />
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {data.latestQuotes ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{d.latestQuotes}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.latestQuotes.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">{d.noQuotes}</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{d.customer}</TableHead>
                        <TableHead className="hidden md:table-cell">{d.projectType}</TableHead>
                        <TableHead>{d.status}</TableHead>
                        <TableHead className="text-right">{d.received}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.latestQuotes.map((q) => (
                        <TableRow key={q.id}>
                          <TableCell>
                            <p className="font-medium">{q.customerName}</p>
                            <p className="text-xs text-muted-foreground">
                              {q.company ?? q.referenceNumber}
                            </p>
                          </TableCell>
                          <TableCell className="hidden max-w-48 truncate md:table-cell">
                            {q.projectType}
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              kind="quote"
                              status={q.status}
                              label={t.status.quote[q.status]}
                            />
                          </TableCell>
                          <TableCell className="text-right text-sm whitespace-nowrap text-muted-foreground">
                            {formatRelative(q.createdAt, locale)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        {data.latestInquiries ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{d.latestInquiries}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.latestInquiries.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">{d.noInquiries}</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{d.customer}</TableHead>
                        <TableHead className="hidden md:table-cell">{d.subject}</TableHead>
                        <TableHead>{d.status}</TableHead>
                        <TableHead className="text-right">{d.received}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.latestInquiries.map((i) => (
                        <TableRow key={i.id}>
                          <TableCell className="font-medium">{i.name}</TableCell>
                          <TableCell className="hidden max-w-56 truncate md:table-cell">
                            {i.subject}
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              kind="inquiry"
                              status={i.status}
                              label={t.status.inquiry[i.status]}
                            />
                          </TableCell>
                          <TableCell className="text-right text-sm whitespace-nowrap text-muted-foreground">
                            {formatRelative(i.createdAt, locale)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>

      {data.activity ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">{d.recentActivity}</CardTitle>
            {hasPermission(user, "audit.view") ? (
              <CardAction>
                <Link
                  href="/admin/audit-logs"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  {d.viewAll}
                </Link>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent>
            {data.activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">{d.noActivity}</p>
            ) : (
              <ol className="divide-y">
                {data.activity.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-2.5 text-sm"
                  >
                    <span className="font-medium">{entry.user?.name ?? d.system}</span>
                    <span>{t.audit.actions[entry.action]}</span>
                    <span className="text-muted-foreground">
                      {t.audit.entities[entry.entity as keyof typeof t.audit.entities] ??
                        entry.entity}
                    </span>
                    <time
                      dateTime={entry.createdAt.toISOString()}
                      className="ml-auto text-xs text-muted-foreground"
                    >
                      {formatRelative(entry.createdAt, locale)}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
