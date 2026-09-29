import "server-only";

import { z } from "zod";

const bool = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

const schema = z.discriminatedUnion("STORAGE_DRIVER", [
  z.object({
    STORAGE_DRIVER: z.literal("local"),
    LOCAL_STORAGE_DIR: z.string().min(1).default("./storage"),
  }),
  z.object({
    STORAGE_DRIVER: z.literal("s3"),
    /** Empty for AWS S3; https://<account>.r2.cloudflarestorage.com for R2; http://minio:9000 for MinIO. */
    S3_ENDPOINT: z
      .url()
      .optional()
      .or(z.literal("").transform(() => undefined)),
    S3_REGION: z.string().min(1).default("auto"),
    S3_BUCKET: z.string().min(3),
    S3_ACCESS_KEY: z.string().min(1),
    S3_SECRET_KEY: z.string().min(1),
    /** Public base URL for objects under public/ (CDN, R2 public domain, or MinIO bucket URL). */
    S3_PUBLIC_URL: z.url(),
    S3_FORCE_PATH_STYLE: bool,
  }),
]);

export type StorageConfig = z.infer<typeof schema>;

let cached: StorageConfig | undefined;

/** Read lazily so builds don't need storage secrets. Throws a clear message when misconfigured. */
export function getStorageConfig(): StorageConfig {
  if (cached) return cached;
  const parsed = schema.safeParse({
    ...process.env,
    STORAGE_DRIVER: process.env.STORAGE_DRIVER || "local",
  });
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Storage is misconfigured. Check these environment variables: ${fields}`);
  }
  // Serverless file systems are temporary: uploads would vanish without an error.
  if (parsed.data.STORAGE_DRIVER === "local" && process.env.VERCEL) {
    throw new Error(
      "STORAGE_DRIVER=local can't be used on Vercel: files would be lost. Use STORAGE_DRIVER=s3 (S3 or Cloudflare R2).",
    );
  }
  cached = parsed.data;
  return cached;
}
