import "server-only";

import { getStorageConfig } from "./config";
import { createLocalAdapter } from "./local";
import { createS3Adapter } from "./s3";
import type { StorageAdapter } from "./types";

let adapter: StorageAdapter | undefined;

/** The configured storage driver (created on first use). */
export function getStorage(): StorageAdapter {
  if (adapter) return adapter;
  const config = getStorageConfig();
  adapter =
    config.STORAGE_DRIVER === "s3"
      ? createS3Adapter(config)
      : createLocalAdapter(config.LOCAL_STORAGE_DIR);
  return adapter;
}

export type { StorageAdapter } from "./types";
