import type { JWT } from "next-auth/jwt";

/** User id carried in a decoded session token, if any. */
export function decodeToken(token: JWT | null | undefined): string | null {
  return typeof token?.uid === "string" && token.uid.length > 0 ? token.uid : null;
}
