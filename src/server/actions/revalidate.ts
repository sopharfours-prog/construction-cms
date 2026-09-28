import "server-only";

import { revalidatePath } from "next/cache";

/**
 * Public pages are cached (ISR). Any change that can appear on the website
 * (content, services in the footer, settings, media) clears every localized
 * page so visitors see it on their next request.
 */
export function revalidatePublicSite() {
  revalidatePath("/[locale]", "layout");
}
