import "server-only";

import { getEnv } from "@/server/config/env";
import { logger } from "@/server/logging/logger";

import { createFakeStorageAdapter } from "./adapters/fake.adapter";
import { createR2StorageAdapter } from "./adapters/r2.adapter";
import type { StorageService } from "./types";

export { createFakeStorageAdapter, type FakeStorageAdapter } from "./adapters/fake.adapter";
export * from "./object-keys";
export type { PresignedRequest, StorageService, StoredObjectInfo } from "./types";

let storageService: StorageService | undefined;

/**
 * Adapter selection: R2 when all four R2_* variables are set (always in
 * production); otherwise the in-memory fake (tests, and local development
 * without R2 credentials — direct uploads will not work there).
 */
export function getStorageService(): StorageService {
  if (storageService) return storageService;
  const env = getEnv();
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = env;

  if (
    env.NODE_ENV !== "test" &&
    R2_ACCOUNT_ID &&
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    R2_BUCKET_NAME
  ) {
    storageService = createR2StorageAdapter({
      accountId: R2_ACCOUNT_ID,
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
      bucket: R2_BUCKET_NAME,
    });
  } else {
    if (env.NODE_ENV === "development") {
      logger.warn("R2 is not configured: using in-memory fake storage (uploads will not persist)");
    }
    storageService = createFakeStorageAdapter();
  }
  return storageService;
}

/** Tests only. Pass `undefined` to fall back to adapter selection. */
export function setStorageServiceForTests(service: StorageService | undefined): void {
  storageService = service;
}
