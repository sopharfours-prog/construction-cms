import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/page-header";
import { ProjectForm } from "@/components/admin/projects/project-form";
import { getAdminMessages } from "@/i18n/admin";
import { getAdminLocale } from "@/i18n/admin-locale";
import { hasPermission, requirePermission } from "@/lib/auth/session";
import { createProjectAction } from "@/server/actions/projects";
import { getProjectFormOptions } from "@/server/services/projects";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getAdminMessages(await getAdminLocale()).projects.new };
}

export default async function NewProjectPage() {
  const user = await requirePermission("projects.create");
  const locale = await getAdminLocale();
  const t = getAdminMessages(locale);
  const options = await getProjectFormOptions(locale);

  return (
    <>
      <AdminPageHeader title={t.projects.new} />
      <ProjectForm
        action={createProjectAction}
        options={options}
        canPublish={hasPermission(user, "projects.publish")}
        labels={t}
      />
    </>
  );
}
