/**
 * URL slug from free text: lower-case ASCII letters, digits and single hyphens
 * (matches the database CHECK constraint). Lao script has no standard
 * romanisation, so a Lao-only title yields "" and the editor must type a slug.
 */
export function slugify(input: string, maxLength = 200): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Slug given to a soft-deleted row so its original slug can be reused. */
export function deletedSlug(slug: string, id: string): string {
  // Cut, then drop a hyphen left at the cut: "a--deleted-…" breaks the slug CHECK constraint.
  const base = slug.slice(0, 170).replace(/-+$/, "");
  return `${base}-deleted-${id.replace(/-/g, "").slice(-12)}`;
}
