export type PutOptions = {
  contentType: string;
  /** Suggested download name; sent as Content-Disposition for non-inline files. */
  downloadName?: string;
  inline?: boolean;
};

export type StoredObject = {
  body: ReadableStream<Uint8Array>;
  size: number;
  contentType: string;
};

export interface StorageAdapter {
  put(key: string, body: Buffer, options: PutOptions): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
  /** URL for objects under public/. Private objects never get a public URL. */
  publicUrl(key: string): string;
}
