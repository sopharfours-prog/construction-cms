"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions";
import { pageInputSchema } from "@/lib/validation/page";
import { createPage, deletePage, setPagePublished, updatePage } from "@/server/services/pages";

import { revalidatePublicSite } from "./revalidate";
import { runAction } from "./run";

const refresh = () => {
  revalidatePath("/admin/pages");
  revalidatePublicSite();
};

export async function createPageAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
) {
  const r = await runAction("pages.create", pageInputSchema, formData, createPage);
  if (r.ok) refresh();
  return r;
}

export async function updatePageAction(
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
) {
  const r = await runAction("pages.update", pageInputSchema, formData, (input, ctx) =>
    updatePage(z.uuid().parse(id), input, ctx),
  );
  if (r.ok) refresh();
  return r;
}

export async function setPagePublishedAction(id: string, published: boolean) {
  const r = await runAction("pages.publish", z.object({ id: z.uuid() }), { id }, ({ id }, ctx) =>
    setPagePublished(id, published, ctx),
  );
  if (r.ok) refresh();
  return r;
}

export async function deletePageAction(id: string) {
  const r = await runAction("pages.delete", z.object({ id: z.uuid() }), { id }, ({ id }, ctx) =>
    deletePage(id, ctx),
  );
  if (r.ok) refresh();
  return r;
}
