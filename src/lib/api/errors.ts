/** Pure module (no auth runtime): services throw these; route wrappers turn them into responses. */
export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "validation"
  | "conflict"
  | "notFound"
  | "tooLarge"
  | "rateLimited"
  | "unexpected";

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly reason?: string,
    readonly headers?: Record<string, string>,
  ) {
    super(code);
  }
}
