import { z } from "zod";

import { apiRoute } from "@/lib/api/route";
import { listMedia, mediaListSchema, uploadMedia } from "@/server/services/media/media";
import { readUpload } from "@/server/services/media/upload-request";

const pageSizeSchema = z.coerce.number().int().min(1).max(60).catch(24);

/** GET /api/media?q=&kind=IMAGE&folder=&page=&pageSize= */
export const GET = apiRoute("media.view", async (request) => {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  return listMedia(mediaListSchema.parse(params), pageSizeSchema.parse(params.pageSize));
});

/** POST /api/media (multipart: file, folderId?, altText?) → 201 with the new media item. */
export const POST = apiRoute("media.upload", async (request, ctx) => {
  const { file, form } = await readUpload(request, ctx.user.id, "media");
  const options = z
    .object({
      folderId: z.uuid().nullish().catch(null),
      altText: z.string().trim().max(255).nullish().catch(null),
    })
    .parse({ folderId: form.get("folderId") || null, altText: form.get("altText") || null });
  const media = await uploadMedia(file, options, ctx);
  return Response.json(media, { status: 201, headers: { "Cache-Control": "no-store" } });
});
