"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions";
import { folderInputSchema } from "@/lib/validation/media";
import { createFolder, deleteFolder, renameFolder } from "@/server/services/media/media";

import { runAction } from "./run";

const refresh = () => revalidatePath("/admin/media");

export async function createFolderAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
) {
  const r = await runAction("media.upload", folderInputSchema, formData, (input, ctx) =>
    createFolder(input.name, ctx),
  );
  if (r.ok) refresh();
  return r;
}

export async function renameFolderAction(
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
) {
  const r = await runAction("media.update", folderInputSchema, formData, (input, ctx) =>
    renameFolder(z.uuid().parse(id), input.name, ctx),
  );
  if (r.ok) refresh();
  return r;
}

export async function deleteFolderAction(id: string) {
  const r = await runAction("media.delete", z.object({ id: z.uuid() }), { id }, (d, ctx) =>
    deleteFolder(d.id, ctx),
  );
  if (r.ok) refresh();
  return r;
}
