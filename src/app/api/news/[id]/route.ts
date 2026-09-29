import { apiRoute, ApiError } from "@/lib/api/route";
import { readJsonInput } from "@/lib/api/json-input";
import { newsInputSchema } from "@/lib/validation/news";
import { afterWrite, uuidOr404 } from "@/server/api/content-routes";
import { deleteNews, getNewsForEdit, updateNews } from "@/server/services/news";

type P = { id: string };

export const GET = apiRoute<P>("news.view", async (_r, ctx) => {
  const news = await getNewsForEdit(uuidOr404(ctx.params.id));
  if (!news) throw new ApiError("notFound");
  return news;
});

/** Any status change (publish, schedule, archive) still needs news.publish. */
export const PUT = apiRoute<P>("news.update", async (request, ctx) => {
  const result = await updateNews(
    uuidOr404(ctx.params.id),
    newsInputSchema.parse(await readJsonInput(request)),
    ctx,
  );
  afterWrite("/admin/news");
  return result;
});

export const DELETE = apiRoute<P>("news.delete", async (_r, ctx) => {
  const result = await deleteNews(uuidOr404(ctx.params.id), ctx);
  afterWrite("/admin/news");
  return result;
});
