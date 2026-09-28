import type { MetadataRoute } from "next";

import { absoluteUrl, isIndexingAllowed } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

/** Staging and development are never indexed; production sets ALLOW_INDEXING=true. */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexingAllowed()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/*?*page="] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
