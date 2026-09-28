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
  .superRefine((value, ctx) => {
    if (value.status === "SCHEDULED") {
      if (!value.publishedAt)
        ctx.addIssue({ code: "custom", path: ["publishedAt"], message: "scheduleNeedsDate" });
      else if (value.publishedAt.getTime() <= Date.now())
        ctx.addIssue({ code: "custom", path: ["publishedAt"], message: "scheduleInPast" });
    }
  });

export type NewsInput = z.output<typeof newsInputSchema>;
