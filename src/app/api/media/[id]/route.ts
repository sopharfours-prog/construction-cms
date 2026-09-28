import { z } from "zod";

import { apiRoute, ApiError } from "@/lib/api/route";
import { revalidatePublicSite } from "@/server/actions/revalidate";
import { mediaUpdateSchema } from "@/lib/validation/media";
import { deleteMedia, getMedia, getMediaUsage, updateMedia } from "@/server/services/media/media";

type Params = { id: string };
const idOf = (params: Params) => {
  const parsed = z.uuid().safeParse(params.id);
  if (!parsed.success) throw new ApiError("notFound");
  return parsed.data;
};

/** GET /api/media/:id → item with uploader, folder and where it is used. */
export const GET = apiRoute<Params>("media.view", async (request, ctx) => {
  const id = idOf(ctx.params);
  const media = await getMedia(id);
  if (!media) throw new ApiError("notFound");
  const { storageKey: _key, ...rest } = media;
  const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "lo";
  return { ...rest, usage: await getMediaUsage(id, locale) };
});

/** PATCH /api/media/:id (JSON: altText, caption, folderId) */
export const PATCH = apiRoute<Params>("media.update", async (request, ctx) => {
  const body = await request.json().catch(() => {
    throw new ApiError("validation", "invalidJson");
  });
  const media = await updateMedia(idOf(ctx.params), mediaUpdateSchema.parse(body), ctx);
  revalidatePublicSite();
  return media;
});

/** DELETE /api/media/:id → 409 mediaInUse while anything displays it. */
export const DELETE = apiRoute<Params>("media.delete", async (_request, ctx) => {
  const result = await deleteMedia(idOf(ctx.params), ctx);
  revalidatePublicSite();
  return result;
});
