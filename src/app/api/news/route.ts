import { apiRoute } from "@/lib/api/route";
import { localeParam, readJsonInput } from "@/lib/api/json-input";
import { newsInputSchema } from "@/lib/validation/news";
import { afterWrite, created } from "@/server/api/content-routes";
import { createNews, listNews, newsListSchema } from "@/server/services/news";

/** GET /api/news?q=&status=&category=&sort=&page=&locale= */
export const GET = apiRoute("news.view", async (request) =>
  listNews(
    newsListSchema.parse(Object.fromEntries(new URL(request.url).searchParams)),
    localeParam(request),
  ),
);

export const POST = apiRoute("news.create", async (request, ctx) => {
  const result = await createNews(newsInputSchema.parse(await readJsonInput(request)), ctx);
  afterWrite("/admin/news");
  return created(result);
});
