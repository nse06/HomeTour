import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { contentTypeForKey, type StorageDriver, type StoredObject } from "./types";

/** Filesystem-backed storage for development and single-server deployments. */
export class LocalStorage implements StorageDriver {
  private root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  private resolve(key: string): string {
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error("Path escapes storage root");
    return full;
  }

  async put(key: string, body: Uint8Array): Promise<void> {
    const file = this.resolve(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
  }

  async get(key: string): Promise<StoredObject | null> {
    try {
      const body = await readFile(this.resolve(key));
      return { body: new Uint8Array(body), contentType: contentTypeForKey(key) };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async size(key: string): Promise<number | null> {
    try {
      return (await stat(this.resolve(key))).size;
    } catch {
      return null;
    }
  }

  async getRange(key: string, start: number, end: number): Promise<ReadableStream<Uint8Array> | null> {
    const file = this.resolve(key);
    try {
      await stat(file);
    } catch {
      return null;
    }
    return Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream<Uint8Array>;
  }

  async delete(keys: string[]): Promise<void> {
    await Promise.all(keys.map((k) => rm(this.resolve(k), { force: true })));
  }
}
