import "server-only";

import type { Locale } from "@/config/i18n";
import { db } from "@/lib/db/client";
import type { TaxonomyInput } from "@/lib/validation/taxonomy";
import { writeAuditLog } from "@/server/services/audit";
import { type ActionContext, ContentError } from "@/server/services/errors";

import { pickTranslation } from "./content/translations";

export type TaxonomyItem = {
  id: string;
  slug: string;
  name: string;
  names: { lo: string; en: string };
  usage: number;
};

const toNames = (translations: { locale: string; name: string }[]) => ({
  lo: translations.find((t) => t.locale === "lo")?.name ?? "",
  en: translations.find((t) => t.locale === "en")?.name ?? "",
});

export async function listTaxonomy(locale: Locale) {
  const [categories, tags] = await Promise.all([
    db.category.findMany({
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
      select: {
        id: true,
        type: true,
        slug: true,
        translations: { select: { locale: true, name: true } },
        _count: {
          select: {
            projects: { where: { deletedAt: null } },
            news: { where: { deletedAt: null } },
          },
        },
      },
    }),
    db.tag.findMany({
      orderBy: { slug: "asc" },
      select: {
        id: true,
        slug: true,
        translations: { select: { locale: true, name: true } },
        _count: { select: { news: true } },
      },
    }),
  ]);
  const cat = (type: "PROJECT" | "NEWS"): TaxonomyItem[] =>
    categories
      .filter((c) => c.type === type)
      .map((c) => ({
        id: c.id,
        slug: c.slug,
        name: pickTranslation(c.translations, locale)?.name ?? c.slug,
        names: toNames(c.translations),
        usage: c._count.projects + c._count.news,
      }));
  return {
    projectCategories: cat("PROJECT"),
    newsCategories: cat("NEWS"),
    tags: tags.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: pickTranslation(t.translations, locale)?.name ?? t.slug,
      names: toNames(t.translations),
      usage: t._count.news,
    })),
  };
}

function translations(input: TaxonomyInput) {
  return [
    { locale: "lo", name: input.names.lo },
    ...(input.names.en ? [{ locale: "en", name: input.names.en }] : []),
  ];
}

export async function saveTaxonomy(id: string | null, input: TaxonomyInput, ctx: ActionContext) {
  const entity = input.kind === "category" ? "Category" : "Tag";
  const clash =
    input.kind === "category"
      ? await db.category.findFirst({
          where: { type: input.type, slug: input.slug, ...(id ? { id: { not: id } } : {}) },
        })
      : await db.tag.findFirst({ where: { slug: input.slug, ...(id ? { id: { not: id } } : {}) } });
  if (clash) throw new ContentError("conflict", "slug", "slugTaken");

  return db.$transaction(async (tx) => {
    let savedId: string;
    if (input.kind === "category") {
      if (id) {
        const found = await tx.category.findUnique({ where: { id } });
        if (!found) throw new ContentError("notFound");
        await tx.category.update({ where: { id }, data: { slug: input.slug } });
        await tx.categoryTranslation.deleteMany({ where: { categoryId: id } });
        await tx.categoryTranslation.createMany({
          data: translations(input).map((t) => ({ ...t, categoryId: id })),
        });
        savedId = id;
      } else {
        const last = await tx.category.aggregate({
          where: { type: input.type },
          _max: { sortOrder: true },
        });
        savedId = (
          await tx.category.create({
            data: {
              type: input.type,
              slug: input.slug,
              sortOrder: (last._max.sortOrder ?? -1) + 1,
              translations: { create: translations(input) },
            },
          })
        ).id;
      }
    } else if (id) {
      const found = await tx.tag.findUnique({ where: { id } });
      if (!found) throw new ContentError("notFound");
      await tx.tag.update({ where: { id }, data: { slug: input.slug } });
      await tx.tagTranslation.deleteMany({ where: { tagId: id } });
      await tx.tagTranslation.createMany({
        data: translations(input).map((t) => ({ ...t, tagId: id })),
      });
      savedId = id;
    } else {
      savedId = (
        await tx.tag.create({
          data: { slug: input.slug, translations: { create: translations(input) } },
        })
      ).id;
    }
    await writeAuditLog(
      {
        action: id ? "UPDATE" : "CREATE",
        entity,
        entityId: savedId,
        userId: ctx.user.id,
        newValue: { slug: input.slug, names: input.names },
        request: ctx.request,
      },
      tx,
    );
    return { id: savedId };
  });
}

/** Hard delete: content keeps existing but loses the category/tag (FK SET NULL / cascade on the join). */
export async function deleteTaxonomy(kind: "category" | "tag", id: string, ctx: ActionContext) {
  const existing =
    kind === "category"
      ? await db.category.findUnique({ where: { id } })
      : await db.tag.findUnique({ where: { id } });
  if (!existing) throw new ContentError("notFound");
  await db.$transaction(async (tx) => {
    if (kind === "category") await tx.category.delete({ where: { id } });
    else await tx.tag.delete({ where: { id } });
    await writeAuditLog(
      {
        action: "DELETE",
        entity: kind === "category" ? "Category" : "Tag",
        entityId: id,
        userId: ctx.user.id,
        oldValue: { slug: existing.slug },
        request: ctx.request,
      },
      tx,
    );
  });
  return { id };
}
