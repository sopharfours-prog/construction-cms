import { apiRoute } from "@/lib/api/route";
import { localeParam, readJsonInput } from "@/lib/api/json-input";
import { projectInputSchema } from "@/lib/validation/project";
import { afterWrite, created } from "@/server/api/content-routes";
import { createProject, listProjects, projectListSchema } from "@/server/services/projects";

/** GET /api/projects?q=&status=&projectStatus=&category=&year=&sort=&page=&locale= */
export const GET = apiRoute("projects.view", async (request) =>
  listProjects(
    projectListSchema.parse(Object.fromEntries(new URL(request.url).searchParams)),
    localeParam(request),
  ),
);

/** POST /api/projects (JSON, same fields as the CMS form) → 201 { id } */
export const POST = apiRoute("projects.create", async (request, ctx) => {
  const result = await createProject(projectInputSchema.parse(await readJsonInput(request)), ctx);
  afterWrite("/admin/projects");
  return created(result);
});
