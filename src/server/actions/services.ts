"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions";
import { serviceInputSchema } from "@/lib/validation/service";
import {
  createService,
  deleteService,
  moveService,
  setServicePublished,
  updateService,
} from "@/server/services/services";

import { revalidatePublicSite } from "./revalidate";
import { runAction } from "./run";

const idSchema = z.object({ id: z.uuid() });
const refresh = () => {
  revalidatePublicSite();
  revalidatePath("/admin/services");
  revalidatePath("/admin");
};

export async function createServiceAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
) {
  const r = await runAction("services.create", serviceInputSchema, formData, createService);
  if (r.ok) refresh();
  return r;
}

export async function updateServiceAction(
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
) {
  const r = await runAction("services.update", serviceInputSchema, formData, (input, ctx) =>
    updateService(z.uuid().parse(id), input, ctx),
  );
  if (r.ok) refresh();
  return r;
}

export async function setServicePublishedAction(id: string, published: boolean) {
  const r = await runAction("services.publish", idSchema, { id }, ({ id }, ctx) =>
    setServicePublished(id, published, ctx),
  );
  if (r.ok) refresh();
  return r;
}

export async function moveServiceAction(id: string, direction: "up" | "down") {
  const r = await runAction(
    "services.update",
    z.object({ id: z.uuid(), direction: z.enum(["up", "down"]) }),
    { id, direction },
    (d, ctx) => moveService(d.id, d.direction, ctx),
  );
  if (r.ok) refresh();
  return r;
}

export async function deleteServiceAction(id: string) {
  const r = await runAction("services.delete", idSchema, { id }, ({ id }, ctx) =>
    deleteService(id, ctx),
  );
  if (r.ok) refresh();
  return r;
}
