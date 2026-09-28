import { z } from "zod";

import { serviceIcons } from "@/config/service-icons";
import { richTextField } from "@/lib/content/rich-text";

import {
  listOf,
  optionalText,
  optionalUuid,
  seoFields,
  slugField,
  titleField,
  translationsSchema,
} from "./content";

export const serviceInputSchema = z.object({
  slug: slugField,
  icon: z.enum(serviceIcons, { error: "invalid" }),
  coverImageId: optionalUuid,
  status: z.enum(["DRAFT", "PUBLISHED"], { error: "invalid" }),
  translations: translationsSchema(
    {
      title: titleField(200),
      description: optionalText(500),
      content: richTextField,
      process: listOf(
        z.object({ label: optionalText(120), value: optionalText(500) }),
        12,
      ).transform((rows) =>
        rows
          .filter((r): r is { label: string; value: string } => Boolean(r.label))
          .map((r) => ({ title: r.label, description: r.value ?? "" })),
      ),
      ...seoFields,
    },
    "title",
  ),
});

export type ServiceInput = z.output<typeof serviceInputSchema>;
