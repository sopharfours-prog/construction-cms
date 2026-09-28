import { apiRoute, publicRoute } from "@/lib/api/route";
import { getAdminLocale } from "@/i18n/admin-locale";
import { handleQuoteSubmission } from "@/server/services/requests/http";
import { listQuotes, quoteListSchema } from "@/server/services/requests/queries";

/** POST /api/quotes — public form submission (multipart; files in "attachments"). */
export const POST = publicRoute(handleQuoteSubmission);

/** GET /api/quotes?q=&status=&assigned=me|none|<userId>&view=active|archived&page= */
export const GET = apiRoute("quotes.view", async (request, ctx) => {
  const filters = quoteListSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return listQuotes(filters, ctx.user.id, await getAdminLocale());
});
