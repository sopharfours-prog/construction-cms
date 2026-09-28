import { z } from "zod";

import {
  currencyField,
  optionalAmount,
  optionalDate,
  optionalText,
  optionalUuid,
  requiredText,
} from "./content";

/** Phone numbers as people type them in Laos: +856 20 5555 1234, 021-123456 … */
const phone = z
  .string()
  .trim()
  .max(40, { error: "tooLong" })
  .regex(/^\+?[0-9 ()-]{6,}$/, { error: "phoneInvalid" });

const email = z
  .string({ error: "required" })
  .trim()
  .toLowerCase()
  .min(1, { error: "required" })
  .max(254, { error: "tooLong" })
  .pipe(z.email({ error: "emailInvalid" }));

/** Fields every public form carries: a honeypot that must stay empty and the signed form token. */
const antiSpam = {
  website: z.string().max(200).optional(),
  formToken: z.string().max(100).optional(),
};

export const inquiryInputSchema = z.object({
  name: requiredText(120),
  email,
  phone: phone.optional().or(z.literal("").transform(() => undefined)),
  company: optionalText(160),
  subject: requiredText(200),
  message: z
    .string({ error: "required" })
    .trim()
    .min(10, { error: "tooShort" })
    .max(5000, { error: "tooLong" }),
  ...antiSpam,
});
export type InquiryInput = z.output<typeof inquiryInputSchema>;

export const quoteInputSchema = z.object({
  customerName: requiredText(120),
  company: optionalText(160),
  email,
  phone,
  serviceId: optionalUuid,
  projectType: requiredText(160),
  location: requiredText(200),
  estimatedBudget: optionalAmount,
  currency: currencyField,
  expectedStartDate: optionalDate,
  description: z
    .string({ error: "required" })
    .trim()
    .min(20, { error: "tooShort" })
    .max(5000, { error: "tooLong" }),
  ...antiSpam,
});
export type QuoteInput = z.output<typeof quoteInputSchema>;

/** Attachments on public forms. Types and sizes are enforced again from file content on the server. */
export const ATTACHMENT_LIMITS = { inquiry: 3, quote: 5, totalBytes: 25 * 1024 * 1024 } as const;

// ─── Admin ───────────────────────────────────────────────────────────────────

export const noteInputSchema = z.object({
  body: z
    .string({ error: "required" })
    .trim()
    .min(1, { error: "required" })
    .max(5000, { error: "tooLong" }),
});

export const replyInputSchema = z.object({
  subject: requiredText(200),
  body: z
    .string({ error: "required" })
    .trim()
    .min(1, { error: "required" })
    .max(10000, { error: "tooLong" }),
});
export type ReplyInput = z.output<typeof replyInputSchema>;

export const assignInputSchema = z.object({ assigneeId: optionalUuid });
