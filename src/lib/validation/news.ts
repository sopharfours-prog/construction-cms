import { z } from "zod";

import { richTextField } from "@/lib/content/rich-text";

import {
  listOf,
  optionalLocalDateTime,
  optionalText,
  optionalUuid,
  seoFields,
  slugField,
  titleField,
  translationsSchema,
} from "./content";

export const newsInputSchema = z
  .object({
    slug: slugField,
    categoryId: optionalUuid,
    coverImageId: optionalUuid,
    seoImageId: optionalUuid,
    status: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"], { error: "invalid" }),
    publishedAt: optionalLocalDateTime,
    tagIds: listOf(z.uuid({ error: "invalid" }), 20),
    translations: translationsSchema(
      { title: titleField(200), excerpt: optionalText(500), content: richTextField, ...seoFields },
      "title",
    ),
  })
  // A time in the past is checked by the news service, which knows whether the
  // article was already scheduled for that time (then it is live, and fine).
  .superRefine((value, ctx) => {
    if (value.status === "SCHEDULED" && !value.publishedAt)
      ctx.addIssue({ code: "custom", path: ["publishedAt"], message: "scheduleNeedsDate" });
  });

export type NewsInput = z.output<typeof newsInputSchema>;
