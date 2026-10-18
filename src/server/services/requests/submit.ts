import "server-only";

import { defaultLocale, isLocale, type Locale } from "@/config/i18n";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db/client";
import { getServerEnv } from "@/lib/env/server";
import type { RequestInfo } from "@/lib/security/request-info";
import { checkFormToken } from "@/lib/security/form-token";
import type { InquiryInput, QuoteInput } from "@/lib/validation/requests";
import { writeAuditLog } from "@/server/services/audit";
import { consumeRateLimit, rateLimitKey, rateLimits } from "@/server/services/rate-limit";
import { nextReferenceNumber } from "@/server/services/reference-number";

import { type IncomingFile, removeObjects, storeAttachments } from "./attachments";

export type SubmitResult = { id: string; reference?: string; locale: Locale; spam?: true };

/**
 * Spam checks shared by public forms. A filled honeypot is reported as
 * "spam" so the caller can answer with a normal-looking success.
 *
 * A bad form token is an error instead, never a silent "success": a real
 * visitor gets one too (token request failed on a weak connection, page left
 * open overnight, a retry right after a fresh token), and telling them their
 * message was sent would lose it. The form fetches a new token and resends.
 */
async function guard(
  input: { website?: string; formToken?: string; email: string },
  request: RequestInfo,
): Promise<"ok" | "spam"> {
  if (input.website) return "spam";
  const token = checkFormToken(input.formToken, getServerEnv().AUTH_SECRET);
  if (token === "tooFast") throw new ApiError("validation", "formTooFast");
  if (token !== "ok") throw new ApiError("validation", "formExpired");

  const ip = await consumeRateLimit(
    rateLimitKey("public-form:ip", request.ipAddress ?? "unknown"),
    rateLimits.publicFormPerIp,
  );
  const email = await consumeRateLimit(
    rateLimitKey("public-form:email", input.email),
    rateLimits.publicFormPerEmail,
  );
  if (!ip.allowed || !email.allowed) {
    throw new ApiError("rateLimited", undefined, {
      "Retry-After": String(Math.max(ip.retryAfterSeconds, email.retryAfterSeconds)),
    });
  }
  return "ok";
}

const localeOf = (value: string | undefined): Locale =>
  value && isLocale(value) ? value : defaultLocale;

export async function submitInquiry(
  input: InquiryInput,
  files: IncomingFile[],
  request: RequestInfo,
  locale?: string,
): Promise<SubmitResult> {
  const lang = localeOf(locale);
  if ((await guard(input, request)) === "spam") return { id: "", locale: lang, spam: true };

  const attachments = await storeAttachments("private/inquiries", files);
  try {
    return await db.$transaction(async (tx) => {
      const inquiry = await tx.inquiry.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone ?? null,
          company: input.company,
          subject: input.subject,
          message: input.message,
          locale: lang,
          ipAddress: request.ipAddress,
          userAgent: request.userAgent?.slice(0, 512) ?? null,
          attachments: { create: attachments },
        },
      });
      await writeAuditLog(
        {
          action: "CREATE",
          entity: "Inquiry",
          entityId: inquiry.id,
          newValue: { via: "contact form", attachments: attachments.length },
          request,
        },
        tx,
      );
      return { id: inquiry.id, locale: lang };
    });
  } catch (error) {
    await removeObjects(attachments.map((a) => a.storageKey));
    throw error;
  }
}

export async function submitQuote(
  input: QuoteInput,
  files: IncomingFile[],
  request: RequestInfo,
  locale?: string,
): Promise<SubmitResult> {
  const lang = localeOf(locale);
  if ((await guard(input, request)) === "spam") return { id: "", locale: lang, spam: true };
  if (
    input.serviceId &&
    !(await db.service.findFirst({
      where: { id: input.serviceId, deletedAt: null, status: "PUBLISHED" },
    }))
  ) {
    throw new ApiError("validation", "serviceInvalid");
  }

  const attachments = await storeAttachments("private/quotes", files);
  try {
    return await db.$transaction(async (tx) => {
      const referenceNumber = await nextReferenceNumber(tx, "quote");
      const quote = await tx.quoteRequest.create({
        data: {
          referenceNumber,
          customerName: input.customerName,
          company: input.company,
          email: input.email,
          phone: input.phone,
          serviceId: input.serviceId,
          projectType: input.projectType,
          location: input.location,
          estimatedBudget: input.estimatedBudget,
          currency: input.currency,
          expectedStartDate: input.expectedStartDate,
          description: input.description,
          locale: lang,
          ipAddress: request.ipAddress,
          userAgent: request.userAgent?.slice(0, 512) ?? null,
          attachments: { create: attachments },
        },
      });
      await writeAuditLog(
        {
          action: "CREATE",
          entity: "QuoteRequest",
          entityId: quote.id,
          newValue: { via: "quote form", referenceNumber, attachments: attachments.length },
          request,
        },
        tx,
      );
      return { id: quote.id, reference: referenceNumber, locale: lang };
    });
  } catch (error) {
    await removeObjects(attachments.map((a) => a.storageKey));
    throw error;
  }
}
