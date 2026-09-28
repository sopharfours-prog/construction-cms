import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { AuthorizationError, authorize } from "@/lib/auth/session";
import type { PermissionKey } from "@/lib/permissions/registry";
import { getRequestInfo } from "@/lib/security/request-info";
import { isSameOrigin } from "@/lib/security/same-origin";
import { type ActionContext, ContentError } from "@/server/services/errors";

import { ApiError, type ApiErrorCode } from "./errors";

export { ApiError, type ApiErrorCode };

const statusOf: Record<ApiErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  validation: 400,
  conflict: 409,
  notFound: 404,
  tooLarge: 413,
  rateLimited: 429,
  unexpected: 500,
};

/** JSON error body: a code and optional field/reason keys, never internals. */
export function apiError(
  code: ApiErrorCode,
  extra: { field?: string; reason?: string; issues?: Record<string, string> } = {},
  headers?: Record<string, string>,
) {
  return NextResponse.json(
    { error: code, ...extra },
    { status: statusOf[code], headers: { "Cache-Control": "no-store", ...headers } },
  );
}

type Handler<P> = (
  request: Request,
  ctx: ActionContext & { params: P },
) => Promise<Response | object>;

/**
 * Wraps a route handler: same-origin check for writes, permission check,
 * and mapping of every failure to a safe JSON response.
 */
export function apiRoute<P = Record<string, never>>(
  permission: PermissionKey,
  handler: Handler<P>,
) {
  return async (request: Request, context: { params: Promise<P> }): Promise<Response> => {
    if (request.method !== "GET" && request.method !== "HEAD" && !isSameOrigin(request.headers)) {
      return apiError("forbidden", { reason: "origin" });
    }
    try {
      const user = await authorize(permission);
      const result = await handler(request, {
        user,
        request: getRequestInfo(request.headers),
        params: await context.params,
      });
      return result instanceof Response
        ? result
        : NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      if (error instanceof AuthorizationError)
        return apiError(error.status === 401 ? "unauthorized" : "forbidden");
      if (error instanceof ApiError)
        return apiError(error.code, { reason: error.reason }, error.headers);
      if (error instanceof ContentError)
        return apiError(error.code, { field: error.field, reason: error.messageKey });
      if (error instanceof ZodError) {
        const issues: Record<string, string> = {};
        for (const issue of error.issues) issues[issue.path.join(".")] ??= issue.message;
        return apiError("validation", { issues });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025")
        return apiError("notFound");
      console.error(`[api] ${request.method} ${new URL(request.url).pathname} failed`, error);
      return apiError("unexpected");
    }
  };
}

/**
 * Public (no session) write endpoint: same-origin required to deter
 * cross-site posting, same safe error mapping as apiRoute.
 */
export function publicRoute(
  handler: (request: Request, info: ReturnType<typeof getRequestInfo>) => Promise<Response>,
) {
  return async (request: Request): Promise<Response> => {
    if (!isSameOrigin(request.headers)) return apiError("forbidden", { reason: "origin" });
    try {
      return await handler(request, getRequestInfo(request.headers));
    } catch (error) {
      if (error instanceof ApiError)
        return apiError(error.code, { reason: error.reason }, error.headers);
      if (error instanceof ZodError) {
        const issues: Record<string, string> = {};
        for (const issue of error.issues) issues[issue.path.join(".")] ??= issue.message;
        return apiError("validation", { issues });
      }
      console.error(`[api] public ${new URL(request.url).pathname} failed`, error);
      return apiError("unexpected");
    }
  };
}
