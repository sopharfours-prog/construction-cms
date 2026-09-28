"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions";
import { newsInputSchema } from "@/lib/validation/news";
import { createNews, deleteNews, setNewsStatus, updateNews } from "@/server/services/news";

import { revalidatePublicSite } from "./revalidate";
import { runAction } from "./run";

const refresh = () => {
  revalidatePublicSite();
  revalidatePath("/admin/news");
  revalidatePath("/admin");
};

export async function createNewsAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
) {
  const r = await runAction("news.create", newsInputSchema, formData, createNews);
  if (r.ok) refresh();
  return r;
}

export async function updateNewsAction(
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
) {
  const r = await runAction("news.update", newsInputSchema, formData, (input, ctx) =>
    updateNews(z.uuid().parse(id), input, ctx),
  );
  if (r.ok) refresh();
  return r;
}

/** Row menu "publish" toggles between PUBLISHED and DRAFT. */
export async function setNewsPublishedAction(id: string, published: boolean) {
  const r = await runAction("news.publish", z.object({ id: z.uuid() }), { id }, ({ id }, ctx) =>
    setNewsStatus(id, published ? "PUBLISHED" : "DRAFT", ctx),
  );
  if (r.ok) refresh();
  return r;
}

export async function deleteNewsAction(id: string) {
  const r = await runAction("news.delete", z.object({ id: z.uuid() }), { id }, ({ id }, ctx) =>
    deleteNews(id, ctx),
  );
  if (r.ok) refresh();
  return r;
}
