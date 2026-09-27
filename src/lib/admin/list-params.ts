import { z } from "zod";

export const DEFAULT_PAGE_SIZE = 25;

/** Coerce ?page= safely: garbage, negatives and huge values fall back to sane bounds. */
export const pageParam = z.coerce.number().int().min(1).max(10_000).catch(1);

/** A single string search param (arrays from repeated params keep the first). */
export function stringParam(max = 200) {
  return z.preprocess(
    (value) => (Array.isArray(value) ? value[0] : value),
    z.string().trim().max(max).optional().catch(undefined),
  );
}

export function paginate(total: number, page: number, pageSize = DEFAULT_PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pageCount);
  return { page: current, pageCount, skip: (current - 1) * pageSize, take: pageSize };
}

/** Build a query string keeping only non-empty values. */
export function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}
