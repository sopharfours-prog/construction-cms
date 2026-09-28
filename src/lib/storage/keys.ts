import { randomUUID } from "node:crypto";

/**
 * Object keys are generated here, never taken from user input:
 *   public/media/2026/09/<uuid>.<ext>      served to everyone
 *   private/quotes/2026/09/<uuid>.<ext>    only through authorized downloads
 */
export type StorageArea = "public/media" | "private/inquiries" | "private/quotes";

export const STORAGE_KEY_PATTERN =
  /^(public|private)\/[a-z]+\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.[a-z0-9]{2,5}$/;

export function createStorageKey(area: StorageArea, extension: string, now = new Date()): string {
  if (!/^[a-z0-9]{2,5}$/.test(extension)) throw new Error("Invalid file extension");
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${area}/${now.getUTCFullYear()}/${month}/${randomUUID()}.${extension}`;
}

export function isValidStorageKey(key: string): boolean {
  return STORAGE_KEY_PATTERN.test(key);
}

export const isPublicKey = (key: string) => key.startsWith("public/");
