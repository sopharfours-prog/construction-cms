import { apiRoute } from "@/lib/api/route";
import { getNotificationSummary } from "@/server/services/dashboard";

/**
 * GET /api/notifications — the bell's counts for the signed-in person (null for
 * queues their role can't see). Polled by the bell, so it stays current
 * without a page reload.
 */
export const GET = apiRoute(null, async (_request, ctx) => getNotificationSummary(ctx.user));
