import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { AdminPageHeader } from "@/components/admin/page-header";
import { ProjectForm, type ProjectFormValues } from "@/components/admin/projects/project-form";
import { getAdminMessages } from "@/i18n/admin";
import { getAdminLocale } from "@/i18n/admin-locale";
import { hasPermission, requirePermission } from "@/lib/auth/session";
import { updateProjectAction } from "@/server/actions/projects";
import { pickTranslation } from "@/server/services/content/translations";
import { getProjectForEdit, getProjectFormOptions } from "@/server/services/projects";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getAdminMessages(await getAdminLocale()).projects.editTitle };
}

const dateOnly = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function EditProjectPage({ params }: PageProps<"/admin/projects/[id]">) {
  const user = await requirePermission("projects.update");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const locale = await getAdminLocale();
  const t = getAdminMessages(locale);
  const [project, options] = await Promise.all([
    getProjectForEdit(id),
    getProjectFormOptions(locale),
  ]);
  if (!project) notFound();

  const initial: ProjectFormValues = {
    slug: project.slug,
    categoryId: project.categoryId ?? "",
    projectStatus: project.projectStatus,
    status: project.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
    featured: project.featured,
    startDate: dateOnly(project.startDate),
    completionDate: dateOnly(project.completionDate),
    budget: project.budget?.toString() ?? "",
    currency: project.currency,
    showBudget: project.showBudget,
    serviceIds: project.services.map((s) => s.serviceId),
    coverImage: project.coverImage,
    gallery: project.images.map((image) => ({
      media: image.media,
      translations: Object.fromEntries(
        image.translations.map((t) => [
          t.locale,
          { altText: t.altText ?? "", caption: t.caption ?? "" },
        ]),
      ),
    })),
    translations: Object.fromEntries(
      project.translations.map((tr) => [
        tr.locale,
        {
          title: tr.title,
          shortDescription: tr.shortDescription ?? "",
          description: tr.description,
          location: tr.location ?? "",
          client: tr.client ?? "",
          architect: tr.architect ?? "",
          contractor: tr.contractor ?? "",
          projectManager: tr.projectManager ?? "",
          specifications: Array.isArray(tr.specifications)
            ? (tr.specifications as { label: string; value: string }[])
            : [],
          seoTitle: tr.seoTitle ?? "",
          seoDescription: tr.seoDescription ?? "",
        },
      ]),
    ),
  };

  return (
    <>
      <AdminPageHeader
        title={pickTranslation(project.translations, locale)?.title ?? t.projects.editTitle}
        description={t.projects.editTitle}
      />
      <ProjectForm
        action={updateProjectAction.bind(null, project.id)}
        initial={initial}
        options={options}
        canPublish={hasPermission(user, "projects.publish")}
        labels={t}
      />
    </>
  );
}
