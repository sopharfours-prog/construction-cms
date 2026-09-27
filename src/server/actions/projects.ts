"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions";
import { projectInputSchema } from "@/lib/validation/project";
import {
  createProject,
  deleteProject,
  setProjectPublished,
  updateProject,
} from "@/server/services/projects";

import { runAction } from "./run";

const idSchema = z.object({ id: z.uuid() });

function refresh() {
  revalidatePath("/admin/projects");
  revalidatePath("/admin");
}

export async function createProjectAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
) {
  const result = await runAction("projects.create", projectInputSchema, formData, createProject);
  if (result.ok) refresh();
  return result;
}

export async function updateProjectAction(
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
) {
  const result = await runAction("projects.update", projectInputSchema, formData, (input, ctx) =>
    updateProject(z.uuid().parse(id), input, ctx),
  );
  if (result.ok) refresh();
  return result;
}

export async function setProjectPublishedAction(id: string, published: boolean) {
  const result = await runAction("projects.publish", idSchema, { id }, ({ id }, ctx) =>
    setProjectPublished(id, published, ctx),
  );
  if (result.ok) refresh();
  return result;
}

export async function deleteProjectAction(id: string) {
  const result = await runAction("projects.delete", idSchema, { id }, ({ id }, ctx) =>
    deleteProject(id, ctx),
  );
  if (result.ok) refresh();
  return result;
}
