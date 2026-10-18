import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { contentDisposition } from "./content-disposition";
import type { StorageConfig } from "./config";
import type { StorageAdapter } from "./types";

type S3Config = Extract<StorageConfig, { STORAGE_DRIVER: "s3" }>;

/** AWS S3, Cloudflare R2 and MinIO all speak this API; only endpoint and path style differ. */
export function createS3Adapter(config: S3Config): StorageAdapter {
  const client = new S3Client({
    region: config.S3_REGION,
    endpoint: config.S3_ENDPOINT,
    forcePathStyle: config.S3_FORCE_PATH_STYLE,
    credentials: { accessKeyId: config.S3_ACCESS_KEY, secretAccessKey: config.S3_SECRET_KEY },
  });
  const base = config.S3_PUBLIC_URL.replace(/\/+$/, "");

  return {
    async put(key, body, options) {
      await client.send(
        new PutObjectCommand({
          Bucket: config.S3_BUCKET,
          Key: key,
          Body: body,
          ContentType: options.contentType,
          ContentLength: body.length,
          ContentDisposition: contentDisposition(options.downloadName, options.inline ?? false),
          // Keys are unique per upload, so public objects never change.
          CacheControl: key.startsWith("public/")
            ? "public, max-age=31536000, immutable"
            : "private, no-store",
        }),
      );
    },
    async get(key, rangeHeader) {
      try {
        const result = await client.send(
          new GetObjectCommand({
            Bucket: config.S3_BUCKET,
            Key: key,
            Range: rangeHeader ?? undefined,
          }),
        );
        if (!result.Body) return null;
        const size = result.ContentLength ?? 0;
        // "bytes 0-499/1234" when the server honoured the Range.
        const part = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(result.ContentRange ?? "");
        return {
          body: result.Body.transformToWebStream() as ReadableStream<Uint8Array>,
          size,
          totalSize: part ? Number(part[3]) : size,
          ...(part ? { range: { start: Number(part[1]), end: Number(part[2]) } } : {}),
          contentType: result.ContentType ?? "application/octet-stream",
        };
      } catch (error) {
        if (error instanceof NoSuchKey || (error as { name?: string }).name === "NoSuchKey")
          return null;
        throw error;
      }
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: config.S3_BUCKET, Key: key }));
    },
    publicUrl(key) {
      if (!key.startsWith("public/")) throw new Error("Private objects have no public URL");
      return `${base}/${key}`;
    },
  };
}
