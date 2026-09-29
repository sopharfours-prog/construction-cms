"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions";
import { certificationSchema, milestoneSchema, teamMemberSchema } from "@/lib/validation/about";
import {
  deleteAboutItem,
  moveAboutItem,
  saveCertification,
  saveMilestone,
  saveTeamMember,
} from "@/server/services/about";

import { revalidatePublicSite } from "./revalidate";
import { runAction } from "./run";

const optionalId = (id: string | null) => (id ? z.uuid().parse(id) : null);
const refresh = () => {
  revalidatePath("/admin/pages/about-content");
  revalidatePublicSite();
};

export async function saveTeamMemberAction(
  id: string | null,
  _prev: ActionResult<unknown> | null,
  formData: FormData,
) {
  const r = await runAction("pages.update", teamMemberSchema, formData, (input, ctx) =>
    saveTeamMember(optionalId(id), input, ctx),
  );
  if (r.ok) refresh();
  return r;
}

export async function saveCertificationAction(
  id: string | null,
  _prev: ActionResult<unknown> | null,
  formData: FormData,
) {
  const r = await runAction("pages.update", certificationSchema, formData, (input, ctx) =>
    saveCertification(optionalId(id), input, ctx),
  );
  if (r.ok) refresh();
  return r;
}

export async function saveMilestoneAction(
  id: string | null,
  _prev: ActionResult<unknown> | null,
  formData: FormData,
) {
  const r = await runAction("pages.update", milestoneSchema, formData, (input, ctx) =>
    saveMilestone(optionalId(id), input, ctx),
  );
  if (r.ok) refresh();
  return r;
}

export async function deleteAboutItemAction(
  kind: "team" | "certification" | "milestone",
  id: string,
) {
  const r = await runAction(
    "pages.delete",
    z.object({ kind: z.enum(["team", "certification", "milestone"]), id: z.uuid() }),
    { kind, id },
    (d, ctx) => deleteAboutItem(d.kind, d.id, ctx),
  );
  if (r.ok) refresh();
  return r;
}

export async function moveAboutItemAction(
  kind: "team" | "certification",
  id: string,
  direction: "up" | "down",
) {
  const r = await runAction(
    "pages.update",
    z.object({
      kind: z.enum(["team", "certification"]),
      id: z.uuid(),
      direction: z.enum(["up", "down"]),
    }),
    { kind, id, direction },
    (d, ctx) => moveAboutItem(d.kind, d.id, d.direction, ctx),
  );
  if (r.ok) refresh();
  return r;
}
