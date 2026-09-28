import { z } from "zod";

import { apiRoute, ApiError } from "@/lib/api/route";
import { revalidatePublicSite } from "@/server/actions/revalidate";
import { replaceMedia } from "@/server/services/media/media";
import { readUpload } from "@/server/services/media/upload-request";

/** POST /api/media/:id/file (multipart: file) replaces the file, keeping the id and every reference. */
export const POST = apiRoute<{ id: string }>("media.upload", async (request, ctx) => {
  const id = z.uuid().safeParse(ctx.params.id);
  if (!id.success) throw new ApiError("notFound");
  const { file } = await readUpload(request, ctx.user.id, "media");
  const media = await replaceMedia(id.data, file, ctx);
  // The URL changed and the old file is gone: cached pages must not keep pointing at it.
  revalidatePublicSite();
  return media;
});
