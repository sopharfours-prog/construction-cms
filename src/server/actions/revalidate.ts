import "server-only";

import { revalidatePath } from "next/cache";

/**
 * Public pages are cached (ISR). Any change that can appear on the website
 * clears every localized page: all of them carry the /[locale] layout tag,
 * including detail pages rendered on first visit. Verified: renamed content
 * shows on the next visit, and unpublished content returns 404.
 */
export function revalidatePublicSite() {
  revalidatePath("/[locale]", "layout");
}
