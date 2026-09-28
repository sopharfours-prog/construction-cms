import { apiRoute } from "@/lib/api/route";
import { handleAttachmentDownload, uuidParam } from "@/server/services/requests/http";

/** GET — download a private attachment (authorized, never served publicly). */
export const GET = apiRoute<{ id: string; attachmentId: string }>(
  "inquiries.view",
  (_request, ctx) =>
    handleAttachmentDownload(
      "inquiry",
      uuidParam(ctx.params.id),
      uuidParam(ctx.params.attachmentId),
    ),
);
