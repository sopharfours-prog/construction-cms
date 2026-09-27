import { z } from "zod";

import { optionalText, requiredText, slugField } from "./content";

export const taxonomyInputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("category"),
    type: z.enum(["PROJECT", "NEWS"], { error: "invalid" }),
    slug: slugField,
    names: z.object({ lo: requiredText(160), en: optionalText(160) }),
  }),
  z.object({
    kind: z.literal("tag"),
    slug: slugField,
    names: z.object({ lo: requiredText(160), en: optionalText(160) }),
  }),
]);

export type TaxonomyInput = z.output<typeof taxonomyInputSchema>;
