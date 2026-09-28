import type { CurrentUser } from "@/lib/auth/session";
import type { RequestInfo } from "@/lib/security/request-info";

/** Who is acting and from where: passed to every mutating service. */
export type ActionContext = { user: CurrentUser; request: RequestInfo };

/** Expected failures thrown by services; runAction maps them to safe results. */
export class ContentError extends Error {
  constructor(
    readonly code: "conflict" | "notFound" | "validation" | "forbidden",
    readonly field?: string,
    readonly messageKey?: string,
  ) {
    super(code);
    this.name = "ContentError";
  }
}
