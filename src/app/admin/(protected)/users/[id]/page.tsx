import { LockIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { FormSection } from "@/components/admin/form/form-section";
import { AdminPageHeader } from "@/components/admin/page-header";
import { UserForm } from "@/components/admin/users/user-form";
import { UserSecurity } from "@/components/admin/users/user-security";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getAdminMessages } from "@/i18n/admin";
import { getAdminLocale } from "@/i18n/admin-locale";
import { hasPermission, requirePermission } from "@/lib/auth/session";
import { updateUserAction } from "@/server/actions/users";
import { getUser } from "@/server/services/users";
import { rolesWithinActor } from "@/server/services/users-access";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getAdminMessages(await getAdminLocale()).users.editTitle };
}

export default async function EditUserPage({ params }: PageProps<"/admin/users/[id]">) {
  const actor = await requirePermission("users.view");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const t = getAdminMessages(await getAdminLocale());
  const [target, roles] = await Promise.all([getUser(id), rolesWithinActor(actor)]);
  if (!target) notFound();

  const isSelf = target.id === actor.id;
  const withinActor = roles.find((r) => r.id === target.roleId)?.withinActor ?? false;
  const canUpdate = hasPermission(actor, "users.update") && withinActor;

  return (
    <>
      <AdminPageHeader title={target.name} description={`${target.email} · ${target.role.name}`} />
      {!canUpdate ? (
        <Alert className="mb-6">
          <LockIcon aria-hidden="true" />
          <AlertDescription>{t.validation.beyondYourPermissions}</AlertDescription>
        </Alert>
      ) : null}
      {canUpdate ? (
        <UserForm
          action={updateUserAction.bind(null, target.id)}
          roles={roles.filter((r) => r.withinActor)}
          isSelf={isSelf}
          labels={t}
          initial={{
            name: target.name,
            email: target.email,
            roleId: target.roleId,
            status: target.status,
            preferredLocale: target.preferredLocale ?? "",
            avatar: target.avatar,
          }}
        />
      ) : null}
      {canUpdate && !isSelf ? (
        <div className="mt-6 max-w-xl">
          <FormSection title={t.users.sections.security}>
            <UserSecurity
              userId={target.id}
              userName={target.name}
              status={target.status}
              can={{ update: true, delete: hasPermission(actor, "users.delete") }}
              labels={t}
            />
          </FormSection>
        </div>
      ) : null}
    </>
  );
}
