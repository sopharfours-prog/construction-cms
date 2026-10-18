import type { ByteRange } from "./range";

export type PutOptions = {
  contentType: string;
  /** Suggested download name; sent as Content-Disposition for non-inline files. */
  downloadName?: string;
  inline?: boolean;
};

export type StoredObject = {
  body: ReadableStream<Uint8Array>;
  /** Bytes in `body`: the whole object, or the requested part of it. */
  size: number;
  /** Size of the whole object. */
  totalSize: number;
  /** Set when a Range was asked for: the part in `body`, or that it lies outside the object. */
  range?: ByteRange | "unsatisfiable";
  contentType: string;
};

export interface StorageAdapter {
  put(key: string, body: Buffer, options: PutOptions): Promise<void>;
  /** `range` is an HTTP Range header value ("bytes=0-499"), for seeking in videos. */
  get(key: string, range?: string | null): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
  /** URL for objects under public/. Private objects never get a public URL. */
  publicUrl(key: string): string;
}
