import { apiRoute, ApiError } from "@/lib/api/route";

import { handleDelete, handlePatch, uuidParam } from "@/server/services/requests/http";
import { getInquiry } from "@/server/services/requests/queries";

type Params = { id: string };

export const GET = apiRoute<Params>("inquiries.view", async (_request, ctx) => {
  const item = await getInquiry(uuidParam(ctx.params.id));
  if (!item) throw new ApiError("notFound");
  const { ipAddress: _ip, userAgent: _ua, ...safe } = item;
  return safe;
});

export const PATCH = apiRoute<Params>("inquiries.update", (request, ctx) =>
  handlePatch("inquiry", uuidParam(ctx.params.id), request, ctx),
);

export const DELETE = apiRoute<Params>("inquiries.delete", (_request, ctx) =>
  handleDelete("inquiry", uuidParam(ctx.params.id), ctx),
);
