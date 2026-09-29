"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions";
import { type SettingsFormKey, settingsFormSchemas } from "@/lib/validation/settings-forms";
import type { SettingsValue } from "@/lib/validation/settings";
import { setLanguageEnabled, updateSettings } from "@/server/services/site-settings";

import { revalidatePublicSite } from "./revalidate";
import { runAction } from "./run";

const keySchema = z.enum(
  Object.keys(settingsFormSchemas) as [SettingsFormKey, ...SettingsFormKey[]],
);

function refresh() {
  revalidatePublicSite();
  // Brand colours and theme also apply to the CMS itself.
  revalidatePath("/admin", "layout");
}

export async function saveSettingsAction(
  key: SettingsFormKey,
  _prev: ActionResult<unknown> | null,
  formData: FormData,
) {
  const k = keySchema.parse(key);
  const r = await runAction("settings.update", settingsFormSchemas[k], formData, (value, ctx) =>
    updateSettings(k, value as SettingsValue<typeof k>, ctx),
  );
  if (r.ok) refresh();
  return r;
}

export async function setLanguageEnabledAction(code: string, enabled: boolean) {
  const r = await runAction(
    "settings.update",
    z.object({ code: z.string().max(10), enabled: z.boolean() }),
    { code, enabled },
    (d, ctx) => setLanguageEnabled(d.code, d.enabled, ctx),
  );
  if (r.ok) refresh();
  return r;
}
