/** Pages the public site links to directly: they can be edited but not deleted or renamed. */
export const systemPageSlugs = ["about", "privacy-policy", "terms"] as const;

/** Built-in routes: a CMS page with one of these slugs could never be opened. */
export const reservedPageSlugs = [
  "projects",
  "services",
  "news",
  "contact",
  "request-quote",
  "search",
];

export function isSystemPage(slug: string): boolean {
  return (systemPageSlugs as readonly string[]).includes(slug);
}
