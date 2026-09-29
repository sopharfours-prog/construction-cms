import { apiRoute } from "@/lib/api/route";
import { localeParam, readJsonInput } from "@/lib/api/json-input";
import { serviceInputSchema } from "@/lib/validation/service";
import { afterWrite, created } from "@/server/api/content-routes";
import { createService, listServices } from "@/server/services/services";

/** GET /api/services?locale= (all services in display order) */
export const GET = apiRoute("services.view", async (request) => ({
  items: await listServices(localeParam(request)),
}));

export const POST = apiRoute("services.create", async (request, ctx) => {
  const result = await createService(serviceInputSchema.parse(await readJsonInput(request)), ctx);
  afterWrite("/admin/services");
  return created(result);
});
