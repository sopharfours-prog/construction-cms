import { z } from "zod";

import { apiRoute, ApiError } from "@/lib/api/route";
import { replaceMedia } from "@/server/services/media/media";
import { readUpload } from "@/server/services/media/upload-request";

/** POST /api/media/:id/file (multipart: file) replaces the file, keeping the id and every reference. */
export const POST = apiRoute<{ id: string }>("media.upload", async (request, ctx) => {
  const id = z.uuid().safeParse(ctx.params.id);
  if (!id.success) throw new ApiError("notFound");
  const { file } = await readUpload(request, ctx.user.id, "media");
  return replaceMedia(id.data, file, ctx);
});
