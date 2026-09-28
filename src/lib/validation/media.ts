import { z } from "zod";

import { optionalText } from "./content";

const optionalUuid = z
  .string()
  .optional()
  .transform((v) => v || null)
  .pipe(z.uuid({ error: "invalid" }).nullable());

export const mediaUpdateSchema = z.object({
  altText: optionalText(255),
  caption: optionalText(500),
  folderId: optionalUuid,
});
export type MediaUpdateInput = z.output<typeof mediaUpdateSchema>;

export const folderInputSchema = z.object({
  name: z
    .string({ error: "required" })
    .trim()
    .min(1, { error: "required" })
    .max(120, { error: "tooLong" }),
});
