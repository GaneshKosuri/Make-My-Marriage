import "server-only";

import { createHash } from "node:crypto";

import { AppError } from "@/server/errors";

import type { StorageService } from "../types";

interface FakeObject {
  bytes: Uint8Array;
  contentType: string | null;
  etag: string;
}

export interface FakeStorageAdapter extends StorageService {
  readonly objects: Map<string, FakeObject>;
  /** Simulates the browser's direct PUT. */
  putObject(key: string, bytes: Uint8Array, contentType: string | null): void;
}

const FAKE_ORIGIN = "https://fake-storage.invalid";

function etagOf(bytes: Uint8Array): string {
  return `"${createHash("md5").update(bytes).digest("hex")}"`;
}

/** In-memory storage for tests and for local development without R2 credentials. */
export function createFakeStorageAdapter(): FakeStorageAdapter {
  const objects = new Map<string, FakeObject>();
  const expiry = (seconds: number) => new Date(Date.now() + seconds * 1000);

  const requireMatch = (key: string, ifMatch?: string): FakeObject => {
    const object = objects.get(key);
    if (!object || (ifMatch !== undefined && object.etag !== ifMatch)) {
      throw new AppError("UPLOAD_ERROR");
    }
    return object;
  };

  return {
    adapterName: "fake",
    objects,

    putObject(key, bytes, contentType) {
      objects.set(key, { bytes, contentType, etag: etagOf(bytes) });
    },

    async presignPut({ key, contentType, expiresInSeconds }) {
      return {
        url: `${FAKE_ORIGIN}/put/${encodeURI(key)}`,
        method: "PUT",
        expiresAt: expiry(expiresInSeconds),
        headers: { "Content-Type": contentType },
      };
    },

    async presignGet({ key, expiresInSeconds }) {
      return {
        url: `${FAKE_ORIGIN}/get/${encodeURI(key)}`,
        method: "GET",
        expiresAt: expiry(expiresInSeconds),
        headers: {},
      };
    },

    async head(key) {
      const object = objects.get(key);
      return object
        ? {
            key,
            sizeBytes: object.bytes.byteLength,
            contentType: object.contentType,
            etag: object.etag,
          }
        : null;
    },

    async readRange(key, { length = 16, ifMatch } = {}) {
      return requireMatch(key, ifMatch).bytes.slice(0, length);
    },

    async copy({ sourceKey, destinationKey, ifMatch }) {
      const source = requireMatch(sourceKey, ifMatch);
      objects.set(destinationKey, { ...source });
      return { etag: source.etag };
    },

    async delete(key) {
      objects.delete(key);
    },
  };
}
