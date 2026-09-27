import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/page-header";
import { TaxonomyManager } from "@/components/admin/taxonomy/taxonomy-manager";
import { getAdminMessages } from "@/i18n/admin";
import { getAdminLocale } from "@/i18n/admin-locale";
import { requirePermission } from "@/lib/auth/session";
import { listTaxonomy } from "@/server/services/taxonomy";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getAdminMessages(await getAdminLocale()).taxonomy.title };
}

export default async function TaxonomyPage() {
  await requirePermission("taxonomy.manage");
  const locale = await getAdminLocale();
  const t = getAdminMessages(locale);
  const data = await listTaxonomy(locale);

  return (
    <>
      <AdminPageHeader title={t.taxonomy.title} description={t.taxonomy.description} />
      <TaxonomyManager
        labels={t}
        groups={[
          {
            kind: "category",
            type: "PROJECT",
            title: t.taxonomy.projectCategories,
            items: data.projectCategories,
          },
          {
            kind: "category",
            type: "NEWS",
            title: t.taxonomy.newsCategories,
            items: data.newsCategories,
          },
          { kind: "tag", title: t.taxonomy.tags, items: data.tags },
        ]}
      />
    </>
  );
}
