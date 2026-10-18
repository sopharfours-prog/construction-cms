import { apiRoute } from "@/lib/api/route";
import { removeOwnAvatar, setOwnAvatar } from "@/server/services/account";
import { readUpload } from "@/server/services/media/upload-request";

/** POST /api/account/avatar (multipart: file) — the signed-in person's own photo. */
export const POST = apiRoute(null, async (request, ctx) => {
  const { file } = await readUpload(request, ctx.user.id, "avatar");
  return setOwnAvatar(file, ctx);
});

/** DELETE /api/account/avatar — back to initials. */
export const DELETE = apiRoute(null, async (_request, ctx) => removeOwnAvatar(ctx));
