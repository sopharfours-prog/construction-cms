import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ChangePasswordForm } from "@/components/admin/account/change-password-form";
import { ProfileForm } from "@/components/admin/account/profile-form";
import { SignOutEverywhere } from "@/components/admin/account/sign-out-everywhere";
import { FormSection } from "@/components/admin/form/form-section";
import { AdminPageHeader } from "@/components/admin/page-header";
import { getAdminMessages } from "@/i18n/admin";
import { getAdminLocale } from "@/i18n/admin-locale";
import { hasPermission, requireUser } from "@/lib/auth/session";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";
import { allPermissions } from "@/lib/permissions/registry";
import { getProfile, listOwnActivity } from "@/server/services/account";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getAdminMessages(await getAdminLocale()).account.title };
}

/**
 * Every signed-in user: their own profile (name, photo, language), what their
 * role allows, their recent activity, password, and signing out everywhere.
 */
export default async function AccountPage() {
  const user = await requireUser();
  const locale = await getAdminLocale();
  const t = getAdminMessages(locale);
  const a = t.account;
  const [profile, activity] = await Promise.all([getProfile(user.id), listOwnActivity(user.id)]);
  if (!profile) notFound();

  // "Projects: View, Create, Edit", in the CMS language (the role editor's labels).
  const groups = new Map<string, string[]>();
  for (const p of allPermissions) {
    if (!user.permissions.has(p.key)) continue;
    const action = p.key.split(".")[1]!;
    const label = t.roles.actions[action as keyof typeof t.roles.actions] ?? action;
    groups.set(p.group, [...(groups.get(p.group) ?? []), label]);
  }
  const isSuperAdmin = profile.role.key === "SUPER_ADMIN";

  return (
    <>
      <AdminPageHeader title={a.title} description={a.description} />
      <div className="grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="grid content-start gap-6">
          <FormSection title={a.profile}>
            <ProfileForm
              labels={t}
              profile={{
                name: profile.name,
                email: profile.email,
                role: profile.role.name,
                preferredLocale: profile.preferredLocale,
                avatarUrl: profile.avatar?.url ?? null,
              }}
            />
          </FormSection>

          <FormSection title={a.overview}>
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div className="grid gap-0.5">
                <dt className="text-muted-foreground">{a.role}</dt>
                <dd className="font-medium">{profile.role.name}</dd>
              </div>
              <div className="grid gap-0.5">
                <dt className="text-muted-foreground">{a.lastSignIn}</dt>
                <dd className="font-medium">
                  {profile.lastLoginAt ? (
                    <time
                      dateTime={profile.lastLoginAt.toISOString()}
                      title={formatDateTime(profile.lastLoginAt, locale)}
                    >
                      {formatRelative(profile.lastLoginAt, locale)}
                    </time>
                  ) : (
                    a.never
                  )}
                </dd>
              </div>
              <div className="grid gap-0.5">
                <dt className="text-muted-foreground">{a.memberSince}</dt>
                <dd className="font-medium">{formatDate(profile.createdAt, locale)}</dd>
              </div>
            </dl>
            <div className="grid gap-2">
              <h3 className="text-sm font-medium">{a.permissions}</h3>
              {isSuperAdmin ? (
                <p className="text-sm text-muted-foreground">{a.fullAccess}</p>
              ) : groups.size === 0 ? (
                <p className="text-sm text-muted-foreground">{a.noPermissions}</p>
              ) : (
                <ul className="grid gap-1.5 text-sm">
                  {[...groups].map(([group, actions]) => (
                    <li key={group} className="flex flex-wrap gap-x-1.5">
                      <span className="font-medium">
                        {t.roles.groups[group as keyof typeof t.roles.groups] ?? group}:
                      </span>
                      <span className="text-muted-foreground">{actions.join(", ")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </FormSection>
        </div>

        <div className="grid content-start gap-6">
          <FormSection title={a.changePassword}>
            <ChangePasswordForm email={user.email} labels={t} />
          </FormSection>

          <FormSection title={a.security}>
            <SignOutEverywhere labels={t} />
          </FormSection>

          <FormSection title={a.activity}>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">{a.activityEmpty}</p>
            ) : (
              <ol className="grid divide-y text-sm">
                {activity.map((entry) => (
                  <li key={entry.id} className="flex items-baseline justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="font-medium">{t.audit.actions[entry.action]}</span>
                      <span className="text-muted-foreground">
                        {" · "}
                        {t.audit.entities[entry.entity as keyof typeof t.audit.entities] ??
                          entry.entity}
                        {/* Sign-ins show where from, so an unfamiliar one stands out. */}
                        {entry.action === "LOGIN" && entry.ipAddress
                          ? ` · ${entry.ipAddress}`
                          : null}
                      </span>
                    </span>
                    <time
                      dateTime={entry.createdAt.toISOString()}
                      title={formatDateTime(entry.createdAt, locale)}
                      className="shrink-0 text-xs text-muted-foreground"
                    >
                      {formatRelative(entry.createdAt, locale)}
                    </time>
                  </li>
                ))}
              </ol>
            )}
            {hasPermission(user, "audit.view") ? (
              <Link
                href={`/admin/audit-logs?user=${user.id}` as Route}
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {a.activityAll}
              </Link>
            ) : null}
          </FormSection>
        </div>
      </div>
    </>
  );
}
