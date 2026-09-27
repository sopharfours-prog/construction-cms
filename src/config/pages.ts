/** Pages the public site links to directly: they can be edited but not deleted or renamed. */
export const systemPageSlugs = ["about", "privacy-policy", "terms"] as const;

export function isSystemPage(slug: string): boolean {
  return (systemPageSlugs as readonly string[]).includes(slug);
}
