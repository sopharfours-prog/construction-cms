export type ByteRange = { start: number; end: number };

/**
 * Resolve an HTTP Range header against a file size (RFC 9110, single range):
 * "bytes=0-499", "bytes=500-" and "bytes=-500" (the last 500 bytes).
 * Returns null when there is no usable Range header (send the whole file) and
 * "unsatisfiable" when the range starts beyond the end of the file (HTTP 416).
 * Multiple ranges are not supported and are treated as no range, which the
 * specification allows.
 */
export function resolveRange(
  header: string | null | undefined,
  size: number,
): ByteRange | "unsatisfiable" | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header?.trim() ?? "");
  if (!match || (match[1] === "" && match[2] === "")) return null;
  if (size === 0) return "unsatisfiable";

  if (match[1] === "") {
    const length = Number(match[2]);
    if (length === 0) return "unsatisfiable";
    return { start: Math.max(0, size - length), end: size - 1 };
  }
  const start = Number(match[1]);
  const end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
  if (!Number.isSafeInteger(start) || start >= size || end < start) return "unsatisfiable";
  return { start, end };
}
