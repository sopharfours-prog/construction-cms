import "server-only";

import { maxUploadBytes, type UploadPolicyName } from "@/lib/files/sniff";
import { ApiError } from "@/lib/api/route";
import { consumeRateLimit, rateLimitKey, rateLimits } from "@/server/services/rate-limit";

/** Multipart overhead allowance on top of the largest file. */
const FORM_OVERHEAD = 64 * 1024;

/**
 * Reads one uploaded file from a multipart request. Rejects oversized bodies
 * from Content-Length before buffering anything, and rate-limits per user.
 */
export async function readUpload(request: Request, userId: string, policy: UploadPolicyName) {
  const limit = maxUploadBytes(policy) + FORM_OVERHEAD;
  const declared = Number(request.headers.get("content-length"));
  if (!declared) throw new ApiError("validation", "lengthRequired");
  if (declared > limit) throw new ApiError("tooLarge", "fileTooLarge");

  const rate = await consumeRateLimit(rateLimitKey("upload", userId), rateLimits.uploadsPerUser);
  if (!rate.allowed)
    throw new ApiError("rateLimited", undefined, { "Retry-After": String(rate.retryAfterSeconds) });

  const form = await request.formData().catch(() => {
    throw new ApiError("validation", "invalidForm");
  });
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError("validation", "fileRequired");
  if (file.size > limit) throw new ApiError("tooLarge", "fileTooLarge");
  return { file: { name: file.name, buffer: Buffer.from(await file.arrayBuffer()) }, form };
}
