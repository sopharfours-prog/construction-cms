import "server-only";

import { headers } from "next/headers";
import type { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/actions";
import { formDataToObject } from "@/lib/content/form-data";
import { AuthorizationError, authorize, type CurrentUser } from "@/lib/auth/session";
import type { PermissionKey } from "@/lib/permissions/registry";
import { getRequestInfo } from "@/lib/security/request-info";
import { type ActionContext, ContentError } from "@/server/services/errors";

export { type ActionContext, ContentError };

/**
 * The only way CMS mutations run:
 *   1. authorize the permission on the server (never trust the UI),
 *   2. validate input with Zod,
 *   3. run the handler,
 *   4. turn every failure into a safe result (no internals reach the client).
 */
export async function runAction<S extends z.ZodType, T>(
  permission: PermissionKey,
  schema: S,
  input: FormData | unknown,
  handler: (data: z.output<S>, ctx: ActionContext) => Promise<T>,
): Promise<ActionResult<T>> {
  let user: CurrentUser;
  try {
    user = await authorize(permission);
  } catch (error) {
    if (error instanceof AuthorizationError)
      return { ok: false, error: error.status === 401 ? "unauthorized" : "forbidden" };
    throw error;
  }

  const raw = input instanceof FormData ? formDataToObject(input) : input;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "validation", fieldErrors };
  }

  try {
    const data = await handler(parsed.data, { user, request: getRequestInfo(await headers()) });
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ContentError) {
      return {
        ok: false,
        error: error.code,
        fieldErrors: error.field
          ? {
              [error.field]:
                error.messageKey ?? (error.code === "conflict" ? "slugTaken" : "invalid"),
            }
          : undefined,
      };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002")
        return { ok: false, error: "conflict", fieldErrors: { slug: "slugTaken" } };
      if (error.code === "P2025") return { ok: false, error: "notFound" };
    }
    console.error(`[action] ${permission} failed`, error);
    return { ok: false, error: "unexpected" };
  }
}
