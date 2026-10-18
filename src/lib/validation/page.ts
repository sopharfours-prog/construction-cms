import { z } from "zod";

import { reservedPageSlugs } from "@/config/pages";
import { richTextField } from "@/lib/content/rich-text";

import { optionalUuid, seoFields, slugField, titleField, translationsSchema } from "./content";

export const pageInputSchema = z.object({
  slug: slugField.refine((slug) => !reservedPageSlugs.includes(slug), { error: "slugReserved" }),
  coverImageId: optionalUuid,
  status: z.enum(["DRAFT", "PUBLISHED"], { error: "invalid" }),
  translations: translationsSchema(
    { title: titleField(200), content: richTextField, ...seoFields },
    "title",
  ),
});

export type PageInput = z.output<typeof pageInputSchema>;
