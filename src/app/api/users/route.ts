import { apiRoute } from "@/lib/api/route";
import { readJsonInput } from "@/lib/api/json-input";
import { userCreateSchema } from "@/lib/validation/users";
import { created } from "@/server/api/content-routes";
import { createUser, listUsers, userListSchema } from "@/server/services/users";

/** GET /api/users?q=&role=&status=&page= (never includes password hashes) */
export const GET = apiRoute("users.view", async (request) =>
  listUsers(userListSchema.parse(Object.fromEntries(new URL(request.url).searchParams))),
);

/** POST /api/users → 201 { id, needsLink, linkSent }. Escalation guards apply. */
export const POST = apiRoute("users.create", async (request, ctx) =>
  created(await createUser(userCreateSchema.parse(await readJsonInput(request)), ctx)),
);
