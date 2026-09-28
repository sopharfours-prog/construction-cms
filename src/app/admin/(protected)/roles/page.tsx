import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/page-header";
import { RoleList } from "@/components/admin/users/role-editor";
import { getAdminMessages } from "@/i18n/admin";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requirePermission } from "@/lib/auth/session";
import { allPermissions } from "@/lib/permissions/registry";
import { listRoles } from "@/server/services/users";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getAdminMessages(await getAdminLocale()).roles.title };
}

export default async function RolesPage() {
  const user = await requirePermission("roles.manage");
  const t = getAdminMessages(await getAdminLocale());
  const roles = await listRoles();
  const groups = [...new Set(allPermissions.map((p) => p.group))].map((group) => ({
    group,
    permissions: allPermissions
      .filter((p) => p.group === group)
      .map((p) => ({ key: p.key, action: p.key.split(".")[1] ?? p.key })),
  }));
  return (
    <>
      <AdminPageHeader title={t.roles.title} description={t.roles.description} />
      <RoleList
        roles={roles}
        groups={groups}
        actorPermissions={[...user.permissions]}
        actorRoleKey={user.role.key}
        labels={t}
      />
    </>
  );
}
