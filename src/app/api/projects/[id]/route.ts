import { apiRoute, ApiError } from "@/lib/api/route";
import { readJsonInput } from "@/lib/api/json-input";
import { projectInputSchema } from "@/lib/validation/project";
import { afterWrite, uuidOr404 } from "@/server/api/content-routes";
import { deleteProject, getProjectForEdit, updateProject } from "@/server/services/projects";

type P = { id: string };

export const GET = apiRoute<P>("projects.view", async (_r, ctx) => {
  const project = await getProjectForEdit(uuidOr404(ctx.params.id));
  if (!project) throw new ApiError("notFound");
  return project;
});

/** PUT replaces the project; publishing still needs projects.publish. */
export const PUT = apiRoute<P>("projects.update", async (request, ctx) => {
  const result = await updateProject(
    uuidOr404(ctx.params.id),
    projectInputSchema.parse(await readJsonInput(request)),
    ctx,
  );
  afterWrite("/admin/projects");
  return result;
});

export const DELETE = apiRoute<P>("projects.delete", async (_r, ctx) => {
  const result = await deleteProject(uuidOr404(ctx.params.id), ctx);
  afterWrite("/admin/projects");
  return result;
});
