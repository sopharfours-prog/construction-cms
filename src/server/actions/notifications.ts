"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { markAllNotificationsRead } from "@/server/services/notifications";

import { runAction } from "./run";

/** "Mark all as read" in the bell: clears every queue the person can see. */
export async function markAllNotificationsReadAction() {
  const r = await runAction(null, z.object({}), {}, (_d, ctx) =>
    markAllNotificationsRead(ctx.user),
  );
  if (r.ok) revalidatePath("/admin", "layout");
  return r;
}
