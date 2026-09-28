"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions";
import { noteInputSchema, replyInputSchema } from "@/lib/validation/requests";
import {
  addRequestNote,
  assignRequest,
  deleteRequest,
  type RequestKind,
  replyToRequest,
  setRequestArchived,
  setRequestStatus,
} from "@/server/services/requests/common";

import { runAction } from "./run";

const kindSchema = z.enum(["inquiry", "quote"]);
const perm = (kind: RequestKind, action: "update" | "delete") =>
  kind === "inquiry" ? (`inquiries.${action}` as const) : (`quotes.${action}` as const);
const refresh = (kind: RequestKind, id?: string) => {
  const base = kind === "inquiry" ? "/admin/inquiries" : "/admin/quotes";
  revalidatePath(base);
  if (id) revalidatePath(`${base}/${id}`);
  revalidatePath("/admin");
};

type Kind = z.infer<typeof kindSchema>;

export async function setRequestStatusAction(kind: Kind, id: string, status: string) {
  const k = kindSchema.parse(kind);
  const r = await runAction(
    perm(k, "update"),
    z.object({ id: z.uuid(), status: z.string().max(20) }),
    { id, status },
    (d, ctx) => setRequestStatus(k, d.id, d.status, ctx),
  );
  if (r.ok) refresh(k, id);
  return r;
}

export async function assignRequestAction(kind: Kind, id: string, assigneeId: string | null) {
  const k = kindSchema.parse(kind);
  const r = await runAction(
    perm(k, "update"),
    z.object({ id: z.uuid(), assigneeId: z.uuid().nullable() }),
    { id, assigneeId },
    (d, ctx) => assignRequest(k, d.id, d.assigneeId, ctx),
  );
  if (r.ok) refresh(k, id);
  return r;
}

export async function setRequestArchivedAction(kind: Kind, id: string, archived: boolean) {
  const k = kindSchema.parse(kind);
  const r = await runAction(perm(k, "update"), z.object({ id: z.uuid() }), { id }, (d, ctx) =>
    setRequestArchived(k, d.id, archived, ctx),
  );
  if (r.ok) refresh(k, id);
  return r;
}

export async function deleteRequestAction(kind: Kind, id: string) {
  const k = kindSchema.parse(kind);
  const r = await runAction(perm(k, "delete"), z.object({ id: z.uuid() }), { id }, (d, ctx) =>
    deleteRequest(k, d.id, ctx),
  );
  if (r.ok) refresh(k);
  return r;
}

export async function addRequestNoteAction(
  kind: Kind,
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
) {
  const k = kindSchema.parse(kind);
  const r = await runAction(perm(k, "update"), noteInputSchema, formData, (d, ctx) =>
    addRequestNote(k, z.uuid().parse(id), d.body, ctx),
  );
  if (r.ok) refresh(k, id);
  return r;
}

export async function replyToRequestAction(
  kind: Kind,
  id: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
) {
  const k = kindSchema.parse(kind);
  const r = await runAction(perm(k, "update"), replyInputSchema, formData, (d, ctx) =>
    replyToRequest(k, z.uuid().parse(id), d, ctx),
  );
  if (r.ok) refresh(k, id);
  return r;
}
