import { z } from "zod";

import {
  optionalDate,
  optionalText,
  optionalUuid,
  titleField,
  translationsSchema,
} from "./content";

const status = z.enum(["DRAFT", "PUBLISHED"], { error: "invalid" });

export const teamMemberSchema = z.object({
  photoId: optionalUuid,
  status,
  translations: translationsSchema(
    { name: titleField(160), position: optionalText(160), bio: optionalText(1000) },
    "name",
  ),
});

export const certificationSchema = z
  .object({
    imageId: optionalUuid,
    issuedAt: optionalDate,
    expiresAt: optionalDate,
    status,
    translations: translationsSchema(
      { name: titleField(200), issuer: optionalText(200), description: optionalText(1000) },
      "name",
    ),
  })
  .superRefine((v, ctx) => {
    if (v.issuedAt && v.expiresAt && v.expiresAt < v.issuedAt)
      ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "dateOrder" });
  });

export const milestoneSchema = z.object({
  year: z.coerce
    .number({ error: "invalid" })
    .int({ error: "invalid" })
    .min(1900, { error: "invalid" })
    .max(2100, { error: "invalid" }),
  status,
  translations: translationsSchema(
    { title: titleField(200), description: optionalText(1000) },
    "title",
  ),
});

export type TeamMemberInput = z.output<typeof teamMemberSchema>;
export type CertificationInput = z.output<typeof certificationSchema>;
export type MilestoneInput = z.output<typeof milestoneSchema>;
