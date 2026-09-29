import { ApiError } from "./errors";

/**
 * JSON request body → the shape the form schemas expect (they validate form
 * fields, which are strings): booleans and numbers become strings, null
 * becomes "". Objects and arrays are kept, so the same Zod schema validates
 * both server actions and the REST API.
 */
function toFormShape(value: unknown, depth = 0): unknown {
  if (depth > 10) throw new ApiError("validation", "tooDeep");
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map((v) => toFormShape(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = Object.create(null);
    for (const [k, v] of Object.entries(value)) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
      out[k] = toFormShape(v, depth + 1);
    }
    return out;
  }
  return value;
}

export async function readJsonInput(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new ApiError("validation", "jsonRequired");
  const body = await request.json().catch(() => {
    throw new ApiError("validation", "invalidJson");
  });
  return toFormShape(body);
}

export const localeParam = (request: Request) =>
  new URL(request.url).searchParams.get("locale") === "en" ? "en" : "lo";
