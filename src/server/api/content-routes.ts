import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ApiError } from "@/lib/api/errors";
import { revalidatePublicSite } from "@/server/actions/revalidate";

/** After an API write: refresh the CMS screens and the cached public site. */
export function afterWrite(adminPath: string) {
  revalidatePath(adminPath, "layout");
  revalidatePublicSite();
}

export function uuidOr404(value: string): string {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) throw new ApiError("notFound");
  return parsed.data;
}

export const created = (body: object) =>
  Response.json(body, { status: 201, headers: { "Cache-Control": "no-store" } });
