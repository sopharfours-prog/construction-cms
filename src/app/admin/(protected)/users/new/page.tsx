import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/page-header";
import { UserForm } from "@/components/admin/users/user-form";
import { getAdminMessages } from "@/i18n/admin";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requirePermission } from "@/lib/auth/session";
import { createUserAction } from "@/server/actions/users";
import { rolesWithinActor } from "@/server/services/users-access";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getAdminMessages(await getAdminLocale()).users.new };
}

export default async function NewUserPage() {
  const user = await requirePermission("users.create");
  const t = getAdminMessages(await getAdminLocale());
  const roles = (await rolesWithinActor(user)).filter((r) => r.withinActor);
  return (
    <>
      <AdminPageHeader title={t.users.new} />
      <UserForm action={createUserAction} roles={roles} labels={t} />
    </>
  );
}
