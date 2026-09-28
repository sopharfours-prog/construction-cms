import { apiRoute, ApiError } from "@/lib/api/route";
import { getAdminLocale } from "@/i18n/admin-locale";
import { handleDelete, handlePatch, uuidParam } from "@/server/services/requests/http";
import { getQuote } from "@/server/services/requests/queries";

type Params = { id: string };

export const GET = apiRoute<Params>("quotes.view", async (_request, ctx) => {
  const item = await getQuote(uuidParam(ctx.params.id), await getAdminLocale());
  if (!item) throw new ApiError("notFound");
  const { ipAddress: _ip, userAgent: _ua, ...safe } = item;
  return safe;
});

export const PATCH = apiRoute<Params>("quotes.update", (request, ctx) =>
  handlePatch("quote", uuidParam(ctx.params.id), request, ctx),
);

export const DELETE = apiRoute<Params>("quotes.delete", (_request, ctx) =>
  handleDelete("quote", uuidParam(ctx.params.id), ctx),
);
