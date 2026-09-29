import { apiRoute, ApiError } from "@/lib/api/route";
import { readJsonInput } from "@/lib/api/json-input";
import { userUpdateSchema } from "@/lib/validation/users";
import { uuidOr404 } from "@/server/api/content-routes";
import { deleteUser, getUser, updateUser } from "@/server/services/users";

type P = { id: string };

export const GET = apiRoute<P>("users.view", async (_r, ctx) => {
  const user = await getUser(uuidOr404(ctx.params.id));
  if (!user) throw new ApiError("notFound");
  return user;
});

export const PUT = apiRoute<P>("users.update", async (request, ctx) =>
  updateUser(uuidOr404(ctx.params.id), userUpdateSchema.parse(await readJsonInput(request)), ctx),
);

export const DELETE = apiRoute<P>("users.delete", async (_r, ctx) =>
  deleteUser(uuidOr404(ctx.params.id), ctx),
);
