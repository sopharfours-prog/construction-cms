import "server-only";

import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { isValidStorageKey } from "./keys";
import type { StorageAdapter } from "./types";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  mp4: "video/mp4",
  webm: "video/webm",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/**
 * Files on local disk (development or a single server with a volume).
 * Public files are served by the /media route; keys are validated so a
 * crafted key can never escape the storage directory.
 */
export function createLocalAdapter(directory: string): StorageAdapter {
  const root = path.resolve(directory);
  const resolve = (key: string) => {
    if (!isValidStorageKey(key)) throw new Error("Invalid storage key");
    const full = path.resolve(root, key);
    if (!full.startsWith(root + path.sep)) throw new Error("Invalid storage key");
    return full;
  };

  return {
    async put(key, body) {
      const file = resolve(key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, body, { flag: "wx" });
    },
    async get(key) {
      const file = resolve(key);
      const info = await stat(file).catch(() => null);
      if (!info?.isFile()) return null;
      const ext = path.extname(file).slice(1);
      return {
        body: Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array>,
        size: info.size,
        contentType: MIME_BY_EXT[ext] ?? "application/octet-stream",
      };
    },
    async delete(key) {
      await rm(resolve(key), { force: true });
    },
    publicUrl(key) {
      if (!key.startsWith("public/")) throw new Error("Private objects have no public URL");
      return `/media/${key.slice("public/".length)}`;
    },
  };
}
