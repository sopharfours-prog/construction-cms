import { z } from "zod";

import { requiredText } from "./content";

/** Longest chat message, in characters (also a CHECK constraint in the database). */
export const CHAT_MESSAGE_MAX = 2000;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Same phone rule as the contact and quote forms: +856 20 5555 1234, 021-123456 … */
const phonePattern = /^\+?[0-9 ()-]{6,}$/;

const messageBody = z
  .string({ error: "required" })
  .trim()
  .min(1, { error: "required" })
  .max(CHAT_MESSAGE_MAX, { error: "tooLong" });

/** First message from the website's chat bubble. */
export const chatStartSchema = z.object({
  name: requiredText(120),
  /** Email or phone, so staff can follow up if the visitor leaves the page. */
  contact: z
    .string({ error: "required" })
    .trim()
    .min(1, { error: "required" })
    .max(254, { error: "tooLong" })
    .refine((v) => emailPattern.test(v) || phonePattern.test(v), { error: "contactInvalid" }),
  message: messageBody,
  locale: z.string().max(10).optional(),
  website: z.string().max(200).optional(),
  formToken: z.string().max(100).optional(),
});
export type ChatStartInput = z.output<typeof chatStartSchema>;

/** Any later message, from the visitor or from staff. */
export const chatMessageSchema = z.object({ body: messageBody });

export const chatStatusSchema = z.object({ status: z.enum(["OPEN", "CLOSED"]) });
