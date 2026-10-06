export interface StoredObject {
  body: Uint8Array;
  contentType: string;
}

export interface StorageDriver {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  /** Byte size without reading the object (used for HTTP range requests). */
  size(key: string): Promise<number | null>;
  /** Stream a byte range [start, end] inclusive. */
  getRange(key: string, start: number, end: number): Promise<ReadableStream<Uint8Array> | null>;
  delete(keys: string[]): Promise<void>;
}

export const CONTENT_TYPES: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  avif: "image/avif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/mp4",
  pdf: "application/pdf",
  json: "application/json",
};

export function contentTypeForKey(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}
