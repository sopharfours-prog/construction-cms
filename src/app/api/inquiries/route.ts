import { apiRoute, publicRoute } from "@/lib/api/route";
import { handleInquirySubmission } from "@/server/services/requests/http";
import { inquiryListSchema, listInquiries } from "@/server/services/requests/queries";

/** POST /api/inquiries — public form submission (multipart; files in "attachments"). */
export const POST = publicRoute(handleInquirySubmission);

/** GET /api/inquiries?q=&status=&assigned=me|none|<userId>&view=active|archived&page= */
export const GET = apiRoute("inquiries.view", async (request, ctx) => {
  const filters = inquiryListSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return listInquiries(filters, ctx.user.id);
});
