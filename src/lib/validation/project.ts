import { z } from "zod";

import { ProjectStatus } from "@/generated/prisma/enums";
import { richTextField } from "@/lib/content/rich-text";

import {
  checkbox,
  galleryField,
  optionalUuid,
  currencyField,
  listOf,
  optionalAmount,
  optionalDate,
  optionalText,
  seoFields,
  slugField,
  titleField,
  translationsSchema,
} from "./content";

export const projectInputSchema = z
  .object({
    slug: slugField,
    categoryId: optionalUuid,
    coverImageId: optionalUuid,
    gallery: galleryField,
    projectStatus: z.enum(ProjectStatus, { error: "invalid" }),
    status: z.enum(["DRAFT", "PUBLISHED"], { error: "invalid" }),
    featured: checkbox,
    startDate: optionalDate,
    completionDate: optionalDate,
    budget: optionalAmount,
    currency: currencyField,
    showBudget: checkbox,
    serviceIds: listOf(z.uuid({ error: "invalid" }), 20),
    translations: translationsSchema(
      {
        title: titleField(200),
        shortDescription: optionalText(500),
        description: richTextField,
        location: optionalText(200),
        client: optionalText(200),
        architect: optionalText(200),
        contractor: optionalText(200),
        projectManager: optionalText(200),
        specifications: listOf(
          z.object({ label: optionalText(80), value: optionalText(200) }),
          30,
        ).transform((rows) =>
          rows.filter((r): r is { label: string; value: string } => Boolean(r.label && r.value)),
        ),
        ...seoFields,
      },
      "title",
    ),
  })
  .superRefine((value, ctx) => {
    if (value.startDate && value.completionDate && value.completionDate < value.startDate) {
      ctx.addIssue({ code: "custom", path: ["completionDate"], message: "dateOrder" });
    }
  });

export type ProjectInput = z.output<typeof projectInputSchema>;
