import { createHash, randomBytes } from "node:crypto";

/** 256-bit random token, URL-safe. Used for password reset links. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hex digest. Tokens are stored hashed so a database leak cannot be replayed. */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
