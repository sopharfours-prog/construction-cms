import "server-only";

import type { Locale } from "@/config/i18n";
import { db } from "@/lib/db/client";
import type { CertificationInput, MilestoneInput, TeamMemberInput } from "@/lib/validation/about";
import { writeAuditLog } from "@/server/services/audit";
import { type ActionContext, ContentError } from "@/server/services/errors";

import { presentLocales } from "./content/translations";
import { assertImages, pickedMediaSelect } from "./media/media";

export type AboutKind = "team" | "certification" | "milestone";
const entity: Record<AboutKind, string> = {
  team: "TeamMember",
  certification: "Certification",
  milestone: "Milestone",
};

/** Everything the About-page editor shows, with every language (for editing). */
export async function listAboutContent() {
  const [team, certifications, milestones] = await Promise.all([
    db.teamMember.findMany({
      orderBy: { sortOrder: "asc" },
      include: { translations: true, photo: { select: pickedMediaSelect } },
    }),
    db.certification.findMany({
      orderBy: { sortOrder: "asc" },
      include: { translations: true, image: { select: pickedMediaSelect } },
    }),
    db.milestone.findMany({
      orderBy: [{ year: "asc" }, { sortOrder: "asc" }],
      include: { translations: true },
    }),
  ]);
  return { team, certifications, milestones };
}

async function audit(
  kind: AboutKind,
  id: string,
  action: "CREATE" | "UPDATE" | "DELETE",
  ctx: ActionContext,
  value?: object,
) {
  await writeAuditLog({
    action,
    entity: entity[kind],
    entityId: id,
    userId: ctx.user.id,
    newValue: action === "DELETE" ? undefined : value,
    oldValue: action === "DELETE" ? value : undefined,
    request: ctx.request,
  });
}

async function nextOrder(kind: Exclude<AboutKind, "milestone">) {
  const agg =
    kind === "team"
      ? await db.teamMember.aggregate({ _max: { sortOrder: true } })
      : await db.certification.aggregate({ _max: { sortOrder: true } });
  return (agg._max.sortOrder ?? -1) + 1;
}

export async function saveTeamMember(
  id: string | null,
  input: TeamMemberInput,
  ctx: ActionContext,
) {
  if (input.photoId) await assertImages([input.photoId], "photoId");
  const translations = presentLocales(input.translations).map((locale) => {
    const t = input.translations[locale]!;
    return { locale, name: t.name, position: t.position ?? "", bio: t.bio };
  });
  const saved = await db.$transaction(async (tx) => {
    if (id) {
      if (!(await tx.teamMember.findUnique({ where: { id } }))) throw new ContentError("notFound");
      await tx.teamMember.update({
        where: { id },
        data: { photoId: input.photoId, status: input.status },
      });
      await tx.teamMemberTranslation.deleteMany({ where: { teamMemberId: id } });
      await tx.teamMemberTranslation.createMany({
        data: translations.map((t) => ({ ...t, teamMemberId: id })),
      });
      return id;
    }
    return (
      await tx.teamMember.create({
        data: {
          photoId: input.photoId,
          status: input.status,
          sortOrder: await nextOrder("team"),
          translations: { create: translations },
        },
      })
    ).id;
  });
  await audit("team", saved, id ? "UPDATE" : "CREATE", ctx, {
    status: input.status,
    names: translations.map((t) => t.name),
  });
  return { id: saved };
}

export async function saveCertification(
  id: string | null,
  input: CertificationInput,
  ctx: ActionContext,
) {
  if (input.imageId) await assertImages([input.imageId], "imageId");
  const translations = presentLocales(input.translations).map((locale) => {
    const t = input.translations[locale]!;
    return { locale, name: t.name, issuer: t.issuer, description: t.description };
  });
  const data = {
    imageId: input.imageId,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
    status: input.status,
  };
  const saved = await db.$transaction(async (tx) => {
    if (id) {
      if (!(await tx.certification.findUnique({ where: { id } })))
        throw new ContentError("notFound");
      await tx.certification.update({ where: { id }, data });
      await tx.certificationTranslation.deleteMany({ where: { certificationId: id } });
      await tx.certificationTranslation.createMany({
        data: translations.map((t) => ({ ...t, certificationId: id })),
      });
      return id;
    }
    return (
      await tx.certification.create({
        data: {
          ...data,
          sortOrder: await nextOrder("certification"),
          translations: { create: translations },
        },
      })
    ).id;
  });
  await audit("certification", saved, id ? "UPDATE" : "CREATE", ctx, {
    status: input.status,
    names: translations.map((t) => t.name),
  });
  return { id: saved };
}

export async function saveMilestone(id: string | null, input: MilestoneInput, ctx: ActionContext) {
  const translations = presentLocales(input.translations).map((locale) => {
    const t = input.translations[locale]!;
    return { locale, title: t.title, description: t.description };
  });
  const saved = await db.$transaction(async (tx) => {
    if (id) {
      if (!(await tx.milestone.findUnique({ where: { id } }))) throw new ContentError("notFound");
      await tx.milestone.update({
        where: { id },
        data: { year: input.year, status: input.status },
      });
      await tx.milestoneTranslation.deleteMany({ where: { milestoneId: id } });
      await tx.milestoneTranslation.createMany({
        data: translations.map((t) => ({ ...t, milestoneId: id })),
      });
      return id;
    }
    return (
      await tx.milestone.create({
        data: { year: input.year, status: input.status, translations: { create: translations } },
      })
    ).id;
  });
  await audit("milestone", saved, id ? "UPDATE" : "CREATE", ctx, {
    year: input.year,
    status: input.status,
  });
  return { id: saved };
}

export async function deleteAboutItem(kind: AboutKind, id: string, ctx: ActionContext) {
  const found =
    kind === "team"
      ? await db.teamMember.findUnique({ where: { id } })
      : kind === "certification"
        ? await db.certification.findUnique({ where: { id } })
        : await db.milestone.findUnique({ where: { id } });
  if (!found) throw new ContentError("notFound");
  if (kind === "team") await db.teamMember.delete({ where: { id } });
  else if (kind === "certification") await db.certification.delete({ where: { id } });
  else await db.milestone.delete({ where: { id } });
  await audit(kind, id, "DELETE", ctx, { id });
  return { id };
}

/** Team and certifications are ordered manually; milestones follow their year. */
export async function moveAboutItem(
  kind: Exclude<AboutKind, "milestone">,
  id: string,
  direction: "up" | "down",
  ctx: ActionContext,
) {
  const list =
    kind === "team"
      ? await db.teamMember.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true } })
      : await db.certification.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true } });
  const index = list.findIndex((x) => x.id === id);
  if (index < 0) throw new ContentError("notFound");
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= list.length) return { id };
  const order = list.map((x) => x.id);
  [order[index], order[target]] = [order[target]!, order[index]!];
  await db.$transaction(
    order.map((itemId, position) =>
      kind === "team"
        ? db.teamMember.update({ where: { id: itemId }, data: { sortOrder: position } })
        : db.certification.update({ where: { id: itemId }, data: { sortOrder: position } }),
    ),
  );
  await audit(kind, id, "UPDATE", ctx, { reordered: direction });
  return { id };
}

export type AboutLocale = Locale;
