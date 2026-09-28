import "server-only";

import { checkUpload, cleanOriginalName } from "@/lib/files/sniff";
import { ApiError } from "@/lib/api/errors";
import { getStorage } from "@/lib/storage";
import { createStorageKey, type StorageArea } from "@/lib/storage/keys";
import { ATTACHMENT_LIMITS } from "@/lib/validation/requests";

export type IncomingFile = { name: string; buffer: Buffer };
export type StoredAttachment = {
  originalName: string;
  mimeType: string;
  size: number;
  storageKey: string;
};

const FORM_OVERHEAD = 256 * 1024;

/**
 * Parse a public multipart submission: body size checked before buffering,
 * attachment count limited, every file validated by content.
 */
export async function readPublicSubmission(request: Request, maxFiles: number) {
  const declared = Number(request.headers.get("content-length"));
  if (!declared) throw new ApiError("validation", "lengthRequired");
  if (declared > ATTACHMENT_LIMITS.totalBytes + FORM_OVERHEAD)
    throw new ApiError("tooLarge", "fileTooLarge");

  const form = await request.formData().catch(() => {
    throw new ApiError("validation", "invalidForm");
  });

  const fields: Record<string, string> = {};
  const files: IncomingFile[] = [];
  for (const [name, value] of form.entries()) {
    if (value instanceof File) {
      if (name === "attachments" && value.size > 0)
        files.push({ name: value.name, buffer: Buffer.from(await value.arrayBuffer()) });
    } else if (!(name in fields)) {
      fields[name] = value;
    }
  }
  if (files.length > maxFiles) throw new ApiError("validation", "tooManyFiles");
  for (const file of files) {
    const check = checkUpload(file.buffer, "attachment");
    if (!check.ok) throw new ApiError("validation", check.reason);
  }
  return { fields, files };
}

/** Store files privately. If any write fails, the ones already written are removed. */
export async function storeAttachments(
  area: Extract<StorageArea, `private/${string}`>,
  files: IncomingFile[],
): Promise<StoredAttachment[]> {
  const storage = getStorage();
  const stored: StoredAttachment[] = [];
  try {
    for (const file of files) {
      const check = checkUpload(file.buffer, "attachment");
      if (!check.ok) throw new ApiError("validation", check.reason);
      const originalName = cleanOriginalName(file.name);
      const storageKey = createStorageKey(area, check.type.ext);
      await storage.put(storageKey, file.buffer, {
        contentType: check.type.mime,
        downloadName: originalName,
      });
      stored.push({
        originalName,
        mimeType: check.type.mime,
        size: file.buffer.length,
        storageKey,
      });
    }
    return stored;
  } catch (error) {
    await removeObjects(stored.map((s) => s.storageKey));
    throw error;
  }
}

export async function removeObjects(keys: string[]) {
  const storage = getStorage();
  await Promise.all(
    keys.map((key) =>
      storage
        .delete(key)
        .catch((error: unknown) => console.error("[requests] could not delete object", key, error)),
    ),
  );
}
