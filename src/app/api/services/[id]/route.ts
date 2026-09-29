import { apiRoute, ApiError } from "@/lib/api/route";
import { readJsonInput } from "@/lib/api/json-input";
import { serviceInputSchema } from "@/lib/validation/service";
import { afterWrite, uuidOr404 } from "@/server/api/content-routes";
import { deleteService, getServiceForEdit, updateService } from "@/server/services/services";

type P = { id: string };

export const GET = apiRoute<P>("services.view", async (_r, ctx) => {
  const service = await getServiceForEdit(uuidOr404(ctx.params.id));
  if (!service) throw new ApiError("notFound");
  return service;
});

export const PUT = apiRoute<P>("services.update", async (request, ctx) => {
  const result = await updateService(
    uuidOr404(ctx.params.id),
    serviceInputSchema.parse(await readJsonInput(request)),
    ctx,
  );
  afterWrite("/admin/services");
  return result;
});

export const DELETE = apiRoute<P>("services.delete", async (_r, ctx) => {
  const result = await deleteService(uuidOr404(ctx.params.id), ctx);
  afterWrite("/admin/services");
  return result;
});
