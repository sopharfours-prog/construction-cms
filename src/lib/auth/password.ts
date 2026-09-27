import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id parameters, pinned explicitly (OWASP Password Storage Cheat Sheet
 * minimum: m=19 MiB, t=2, p=1) so a library upgrade cannot silently weaken
 * them. Hashes embed their parameters, so raising these later still verifies
 * old hashes; rehash on next login when `needsRehash` returns true.
 *
 * Not marked server-only because the Prisma seed (plain Node) uses it; the
 * native module cannot be bundled for the browser in any case.
 */
const ARGON2_OPTIONS = {
  algorithm: 2, // Argon2id
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "./password-policy";

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

/** Constant-time verification. Returns false (never throws) for malformed hashes. */
export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

export function needsRehash(passwordHash: string): boolean {
  const expected = `$argon2id$v=19$m=${ARGON2_OPTIONS.memoryCost},t=${ARGON2_OPTIONS.timeCost},p=${ARGON2_OPTIONS.parallelism}$`;
  return !passwordHash.startsWith(expected);
}
