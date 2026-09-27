/** Result of every CMS server action. Messages are dictionary keys, not text. */
export type ActionError =
  "unauthorized" | "forbidden" | "validation" | "conflict" | "notFound" | "unexpected";

export type ActionResult<T = undefined> =
  { ok: true; data?: T } | { ok: false; error: ActionError; fieldErrors?: Record<string, string> };

export const initialActionState: ActionResult | null = null;
