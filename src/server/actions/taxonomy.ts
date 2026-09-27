"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions";
import { taxonomyInputSchema } from "@/lib/validation/taxonomy";
import { deleteTaxonomy, saveTaxonomy } from "@/server/services/taxonomy";

import { runAction } from "./run";

export async function saveTaxonomyAction(
  id: string | null,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
) {
  const r = await runAction("taxonomy.manage", taxonomyInputSchema, formData, (input, ctx) =>
    saveTaxonomy(id ? z.uuid().parse(id) : null, input, ctx),
  );
  if (r.ok) revalidatePath("/admin/taxonomy");
  return r;
}

export async function deleteTaxonomyAction(kind: "category" | "tag", id: string) {
  const r = await runAction(
    "taxonomy.manage",
    z.object({ kind: z.enum(["category", "tag"]), id: z.uuid() }),
    { kind, id },
    (d, ctx) => deleteTaxonomy(d.kind, d.id, ctx),
  );
  if (r.ok) revalidatePath("/admin/taxonomy");
  return r;
}
