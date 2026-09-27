import { publicEnv } from "@/lib/env/public";

/**
 * Technical site configuration only.
 * Company name, contact details, social links and SEO copy are content and
 * live in the database (Website Settings), not here.
 */
export const siteConfig = {
  url: publicEnv.NEXT_PUBLIC_SITE_URL,
  /** Used only until Website Settings are stored in the database. */
  fallbackName: "Construction CMS",
} as const;
