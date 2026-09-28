import "server-only";

import { after } from "next/server";
import { z } from "zod";

import { ApiError } from "@/lib/api/errors";
import { contentDisposition } from "@/lib/storage/content-disposition";
import { ATTACHMENT_LIMITS, inquiryInputSchema, quoteInputSchema } from "@/lib/validation/requests";
import type { ActionContext } from "@/server/services/errors";

import { readPublicSubmission } from "./attachments";
import {
  assignRequest,
  deleteRequest,
  openAttachment,
  type RequestKind,
  setRequestArchived,
  setRequestStatus,
} from "./common";
import { notifyNewRequest } from "./notify";
import { submitInquiry, submitQuote } from "./submit";

const created = (body: object) =>
  Response.json(body, { status: 201, headers: { "Cache-Control": "no-store" } });

/** POST handler body for the public contact form. */
export async function handleInquirySubmission(request: Request, info: ActionContext["request"]) {
  const { fields, files } = await readPublicSubmission(request, ATTACHMENT_LIMITS.inquiry);
  const input = inquiryInputSchema.parse(fields);
  const result = await submitInquiry(input, files, info, fields.locale);
  if (!result.spam) {
    after(() =>
      notifyNewRequest({
        kind: "inquiry",
        id: result.id,
        name: input.name,
        email: input.email,
        locale: result.locale,
        subject: input.subject,
        lines: [
          ["Name", input.name],
          ["Email", input.email],
          ["Phone", input.phone ?? "—"],
          ["Company", input.company ?? "—"],
          ["Subject", input.subject],
          ["Attachments", String(files.length)],
          ["", input.message],
        ],
      }),
    );
  }
  return created({ ok: true });
}

/** POST handler body for the public quote form. */
export async function handleQuoteSubmission(request: Request, info: ActionContext["request"]) {
  const { fields, files } = await readPublicSubmission(request, ATTACHMENT_LIMITS.quote);
  const input = quoteInputSchema.parse(fields);
  const result = await submitQuote(input, files, info, fields.locale);
  if (!result.spam && result.reference) {
    const reference = result.reference;
    after(() =>
      notifyNewRequest({
        kind: "quote",
        id: result.id,
        reference,
        name: input.customerName,
        email: input.email,
        locale: result.locale,
        subject: `${input.projectType} – ${input.location}`,
        lines: [
          ["Reference", reference],
          ["Customer", input.customerName],
          ["Company", input.company ?? "—"],
          ["Email", input.email],
          ["Phone", input.phone],
          ["Project type", input.projectType],
          ["Location", input.location],
          ["Budget", input.estimatedBudget ? `${input.estimatedBudget} ${input.currency}` : "—"],
          ["Expected start", input.expectedStartDate?.toISOString().slice(0, 10) ?? "—"],
          ["Attachments", String(files.length)],
          ["", input.description],
        ],
      }),
    );
  }
  // A caught spam submission gets the same shape of answer, minus the reference.
  return created({ ok: true, ...(result.reference ? { reference: result.reference } : {}) });
}

const patchSchema = z
  .object({
    status: z.string().max(20).optional(),
    assigneeId: z.uuid().nullable().optional(),
    archived: z.boolean().optional(),
  })
  .strict();

/** PATCH /api/{inquiries|quotes}/:id → { status?, assigneeId?, archived? } */
export async function handlePatch(
  kind: RequestKind,
  id: string,
  request: Request,
  ctx: ActionContext,
) {
  const body = patchSchema.parse(await request.json().catch(() => ({ invalid: true })));
  if (body.status !== undefined) await setRequestStatus(kind, id, body.status, ctx);
  if (body.assigneeId !== undefined) await assignRequest(kind, id, body.assigneeId, ctx);
  if (body.archived !== undefined) await setRequestArchived(kind, id, body.archived, ctx);
  return { id };
}

export const handleDelete = deleteRequest;

/** Stream a private attachment as a download that can never run in the browser. */
export async function handleAttachmentDownload(
  kind: RequestKind,
  id: string,
  attachmentId: string,
) {
  const found = await openAttachment(kind, id, attachmentId);
  if (!found) throw new ApiError("notFound");
  return new Response(found.object.body, {
    headers: {
      "Content-Type": found.attachment.mimeType,
      "Content-Length": String(found.object.size),
      "Content-Disposition": contentDisposition(found.attachment.originalName, false),
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'",
      "Cache-Control": "private, no-store",
    },
  });
}

export const uuidParam = (value: string) => {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) throw new ApiError("notFound");
  return parsed.data;
};
