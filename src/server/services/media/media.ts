import "server-only";

import { z } from "zod";

import type { Locale } from "@/config/i18n";
import type { MediaKind, Prisma } from "@/generated/prisma/client";
import { pageParam, paginate, stringParam } from "@/lib/admin/list-params";
import { db } from "@/lib/db/client";
import { checkUpload, cleanOriginalName, type DetectedType } from "@/lib/files/sniff";
import { getStorage } from "@/lib/storage";
import { createStorageKey } from "@/lib/storage/keys";
import type { MediaUpdateInput } from "@/lib/validation/media";
import { writeAuditLog } from "@/server/services/audit";
import { type ActionContext, ContentError } from "@/server/services/errors";

import { pickTranslation } from "../content/translations";
import { processImage } from "./image";

export const MEDIA_PAGE_SIZE = 24;

export const mediaListSchema = z.object({
  page: pageParam,
  q: stringParam(200),
  kind: z.enum(["IMAGE", "VIDEO", "DOCUMENT"]).optional().catch(undefined),
  folder: z
    .union([z.uuid(), z.literal("none")])
    .optional()
    .catch(undefined),
});
export type MediaListFilters = z.infer<typeof mediaListSchema>;

export const mediaSelect = {
  id: true,
  kind: true,
  filename: true,
  originalName: true,
  mimeType: true,
  size: true,
  width: true,
  height: true,
  url: true,
  altText: true,
  caption: true,
  blurDataUrl: true,
  folderId: true,
  createdAt: true,
} satisfies Prisma.MediaSelect;

/** Fields the CMS forms need to preview a chosen image. */
export const pickedMediaSelect = {
  id: true,
  url: true,
  altText: true,
  blurDataUrl: true,
  originalName: true,
  kind: true,
  mimeType: true,
} satisfies Prisma.MediaSelect;

export type MediaItem = Prisma.MediaGetPayload<{ select: typeof mediaSelect }>;

export async function listMedia(filters: MediaListFilters, pageSize = MEDIA_PAGE_SIZE) {
  const where: Prisma.MediaWhereInput = {
    deletedAt: null,
    ...(filters.kind ? { kind: filters.kind } : {}),
    ...(filters.folder === "none"
      ? { folderId: null }
      : filters.folder
        ? { folderId: filters.folder }
        : {}),
    ...(filters.q
      ? {
          OR: [
            { originalName: { contains: filters.q, mode: "insensitive" } },
            { altText: { contains: filters.q, mode: "insensitive" } },
            { caption: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const total = await db.media.count({ where });
  const { page, pageCount, skip, take } = paginate(total, filters.page, pageSize);
  const items = await db.media.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take,
    select: mediaSelect,
  });
  return { items, total, page, pageCount };
}

export function listFolders() {
  return db.mediaFolder.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, _count: { select: { media: { where: { deletedAt: null } } } } },
  });
}

export type MediaUsage = {
  type:
    | "project"
    | "projectGallery"
    | "service"
    | "news"
    | "newsSeo"
    | "page"
    | "team"
    | "certification"
    | "avatar";
  id: string;
  label: string;
};

/** Everything that displays this file. Used to block deleting files still in use. */
export async function getMediaUsage(id: string, locale: Locale): Promise<MediaUsage[]> {
  const title = { select: { locale: true, title: true } } as const;
  const [projects, gallery, services, news, seo, pages, team, certs, users] = await Promise.all([
    db.project.findMany({
      where: { coverImageId: id, deletedAt: null },
      select: { id: true, translations: title },
    }),
    db.projectImage.findMany({
      where: { mediaId: id, project: { deletedAt: null } },
      select: { project: { select: { id: true, translations: title } } },
    }),
    db.service.findMany({
      where: { coverImageId: id, deletedAt: null },
      select: { id: true, translations: title },
    }),
    db.news.findMany({
      where: { coverImageId: id, deletedAt: null },
      select: { id: true, translations: title },
    }),
    db.news.findMany({
      where: { seoImageId: id, deletedAt: null },
      select: { id: true, translations: title },
    }),
    db.page.findMany({
      where: { coverImageId: id, deletedAt: null },
      select: { id: true, translations: title },
    }),
    db.teamMember.findMany({
      where: { photoId: id },
      select: { id: true, translations: { select: { locale: true, name: true } } },
    }),
    db.certification.findMany({
      where: { imageId: id },
      select: { id: true, translations: { select: { locale: true, name: true } } },
    }),
    db.user.findMany({
      where: { avatarId: id, deletedAt: null },
      select: { id: true, name: true },
    }),
  ]);
  const t = (r: { id: string; translations: { locale: string; title: string }[] }) =>
    pickTranslation(r.translations, locale)?.title ?? r.id;
  const n = (r: { id: string; translations: { locale: string; name: string }[] }) =>
    pickTranslation(r.translations, locale)?.name ?? r.id;
  return [
    ...projects.map((r) => ({ type: "project" as const, id: r.id, label: t(r) })),
    ...gallery.map((r) => ({
      type: "projectGallery" as const,
      id: r.project.id,
      label: t(r.project),
    })),
    ...services.map((r) => ({ type: "service" as const, id: r.id, label: t(r) })),
    ...news.map((r) => ({ type: "news" as const, id: r.id, label: t(r) })),
    ...seo.map((r) => ({ type: "newsSeo" as const, id: r.id, label: t(r) })),
    ...pages.map((r) => ({ type: "page" as const, id: r.id, label: t(r) })),
    ...team.map((r) => ({ type: "team" as const, id: r.id, label: n(r) })),
    ...certs.map((r) => ({ type: "certification" as const, id: r.id, label: n(r) })),
    ...users.map((r) => ({ type: "avatar" as const, id: r.id, label: r.name })),
  ];
}

export async function getMedia(id: string) {
  return db.media.findFirst({
    where: { id, deletedAt: null },
    select: {
      ...mediaSelect,
      storageKey: true,
      updatedAt: true,
      uploadedBy: { select: { name: true } },
      folder: { select: { name: true } },
    },
  });
}

type Prepared = {
  data: Buffer;
  type: DetectedType;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
};

/** Validate by content, then re-encode images. Throws ContentError with a field-level reason. */
async function prepare(buffer: Buffer): Promise<Prepared> {
  const check = checkUpload(buffer, "media");
  if (!check.ok) throw new ContentError("validation", "file", check.reason);
  if (check.type.kind !== "IMAGE")
    return { data: buffer, type: check.type, width: null, height: null, blurDataUrl: null };
  try {
    const image = await processImage(buffer, check.type);
    return {
      data: image.data,
      type: check.type,
      width: image.width,
      height: image.height,
      blurDataUrl: image.blurDataUrl,
    };
  } catch {
    // Header looked like an image but the body can't be decoded (corrupt or hostile).
    throw new ContentError("validation", "file", "fileCorrupt");
  }
}

async function store(prepared: Prepared, originalName: string) {
  const key = createStorageKey("public/media", prepared.type.ext);
  const storage = getStorage();
  await storage.put(key, prepared.data, {
    contentType: prepared.type.mime,
    downloadName: originalName,
    inline: prepared.type.kind !== "DOCUMENT" || prepared.type.ext === "pdf",
  });
  return { key, url: storage.publicUrl(key) };
}

async function removeObject(key: string) {
  try {
    await getStorage().delete(key);
  } catch (error) {
    console.error("[media] could not delete object", key, error);
  }
}

export async function uploadMedia(
  file: { name: string; buffer: Buffer },
  options: { folderId?: string | null; altText?: string | null },
  ctx: ActionContext,
) {
  const prepared = await prepare(file.buffer);
  const originalName = cleanOriginalName(file.name);
  if (options.folderId && !(await db.mediaFolder.findUnique({ where: { id: options.folderId } })))
    throw new ContentError("validation", "folderId", "invalid");
  const { key, url } = await store(prepared, originalName);

  try {
    return await db.$transaction(async (tx) => {
      const media = await tx.media.create({
        data: {
          kind: prepared.type.kind as MediaKind,
          filename: key.split("/").pop()!,
          originalName,
          mimeType: prepared.type.mime,
          size: prepared.data.length,
          width: prepared.width,
          height: prepared.height,
          blurDataUrl: prepared.blurDataUrl,
          storageKey: key,
          url,
          altText: options.altText ?? null,
          folderId: options.folderId ?? null,
          uploadedById: ctx.user.id,
        },
        select: mediaSelect,
      });
      await writeAuditLog(
        {
          action: "UPLOAD",
          entity: "Media",
          entityId: media.id,
          userId: ctx.user.id,
          newValue: { originalName, mimeType: media.mimeType, size: media.size },
          request: ctx.request,
        },
        tx,
      );
      return media;
    });
  } catch (error) {
    // Don't leave an orphaned object in the bucket.
    await removeObject(key);
    throw error;
  }
}

/** New file under a new key (so caches never serve the old one); every reference follows the id. */
export async function replaceMedia(
  id: string,
  file: { name: string; buffer: Buffer },
  ctx: ActionContext,
) {
  const existing = await db.media.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ContentError("notFound");
  const prepared = await prepare(file.buffer);
  if (prepared.type.kind !== existing.kind)
    throw new ContentError("validation", "file", "replaceKind");
  const originalName = cleanOriginalName(file.name);
  const { key, url } = await store(prepared, originalName);

  let media: MediaItem;
  try {
    media = await db.$transaction(async (tx) => {
      const updated = await tx.media.update({
        where: { id },
        data: {
          filename: key.split("/").pop()!,
          originalName,
          mimeType: prepared.type.mime,
          size: prepared.data.length,
          width: prepared.width,
          height: prepared.height,
          blurDataUrl: prepared.blurDataUrl,
          storageKey: key,
          url,
        },
        select: mediaSelect,
      });
      await writeAuditLog(
        {
          action: "UPLOAD",
          entity: "Media",
          entityId: id,
          userId: ctx.user.id,
          oldValue: { originalName: existing.originalName, size: existing.size },
          newValue: { replaced: true, originalName, size: updated.size },
          request: ctx.request,
        },
        tx,
      );
      return updated;
    });
  } catch (error) {
    await removeObject(key);
    throw error;
  }
  await removeObject(existing.storageKey);
  return media;
}

export async function updateMedia(id: string, input: MediaUpdateInput, ctx: ActionContext) {
  const existing = await db.media.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ContentError("notFound");
  if (input.folderId && !(await db.mediaFolder.findUnique({ where: { id: input.folderId } })))
    throw new ContentError("validation", "folderId", "invalid");
  return db.$transaction(async (tx) => {
    const media = await tx.media.update({ where: { id }, data: input, select: mediaSelect });
    await writeAuditLog(
      {
        action: "UPDATE",
        entity: "Media",
        entityId: id,
        userId: ctx.user.id,
        oldValue: {
          altText: existing.altText,
          caption: existing.caption,
          folderId: existing.folderId,
        },
        newValue: input,
        request: ctx.request,
      },
      tx,
    );
    return media;
  });
}

/** Refuses while the file is used anywhere; the row is kept (soft delete) for the audit trail. */
export async function deleteMedia(id: string, ctx: ActionContext) {
  const existing = await db.media.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ContentError("notFound");
  const usage = await getMediaUsage(id, "en");
  if (usage.length) throw new ContentError("conflict", undefined, "mediaInUse");

  await db.$transaction(async (tx) => {
    await tx.media.update({ where: { id }, data: { deletedAt: new Date(), folderId: null } });
    await writeAuditLog(
      {
        action: "DELETE",
        entity: "Media",
        entityId: id,
        userId: ctx.user.id,
        oldValue: { originalName: existing.originalName, storageKey: existing.storageKey },
        request: ctx.request,
      },
      tx,
    );
  });
  await removeObject(existing.storageKey);
  return { id };
}

export async function createFolder(name: string, ctx: ActionContext) {
  const clash = await db.mediaFolder.findFirst({
    where: { parentId: null, name: { equals: name, mode: "insensitive" } },
  });
  if (clash) throw new ContentError("conflict", "name", "folderExists");
  return db.$transaction(async (tx) => {
    const folder = await tx.mediaFolder.create({ data: { name } });
    await writeAuditLog(
      {
        action: "CREATE",
        entity: "MediaFolder",
        entityId: folder.id,
        userId: ctx.user.id,
        newValue: { name },
        request: ctx.request,
      },
      tx,
    );
    return { id: folder.id };
  });
}

export async function renameFolder(id: string, name: string, ctx: ActionContext) {
  const existing = await db.mediaFolder.findUnique({ where: { id } });
  if (!existing) throw new ContentError("notFound");
  const clash = await db.mediaFolder.findFirst({
    where: {
      parentId: existing.parentId,
      name: { equals: name, mode: "insensitive" },
      id: { not: id },
    },
  });
  if (clash) throw new ContentError("conflict", "name", "folderExists");
  await db.$transaction(async (tx) => {
    await tx.mediaFolder.update({ where: { id }, data: { name } });
    await writeAuditLog(
      {
        action: "UPDATE",
        entity: "MediaFolder",
        entityId: id,
        userId: ctx.user.id,
        oldValue: { name: existing.name },
        newValue: { name },
        request: ctx.request,
      },
      tx,
    );
  });
  return { id };
}

/** Files in the folder are kept and move to "no folder". */
export async function deleteFolder(id: string, ctx: ActionContext) {
  const existing = await db.mediaFolder.findUnique({ where: { id } });
  if (!existing) throw new ContentError("notFound");
  await db.$transaction(async (tx) => {
    await tx.mediaFolder.delete({ where: { id } });
    await writeAuditLog(
      {
        action: "DELETE",
        entity: "MediaFolder",
        entityId: id,
        userId: ctx.user.id,
        oldValue: { name: existing.name },
        request: ctx.request,
      },
      tx,
    );
  });
  return { id };
}

/** Ensures ids point at live images (for cover and gallery fields). */
export async function assertImages(ids: string[], field: string) {
  if (!ids.length) return;
  const found = await db.media.count({
    where: { id: { in: ids }, deletedAt: null, kind: "IMAGE" },
  });
  if (found !== new Set(ids).size) throw new ContentError("validation", field, "mediaInvalid");
}
