import "server-only";

export interface PresignedRequest {
  url: string;
  method: "PUT" | "GET";
  expiresAt: Date;
  /** Headers the browser must send unchanged (they are part of the signature). */
  headers: Record<string, string>;
}

export interface StoredObjectInfo {
  key: string;
  sizeBytes: number;
  contentType: string | null;
  etag: string;
}

/**
 * Object storage (SYSTEM_DESIGN §37–40, §89). The bucket is private; browsers
 * upload and download directly with short-lived signed URLs, so binaries never
 * pass through the app. Business code never imports the AWS SDK.
 */
export interface StorageService {
  readonly adapterName: string;

  /** Signed PUT that pins Content-Type and Content-Length. */
  presignPut(input: {
    key: string;
    contentType: string;
    contentLength: number;
    expiresInSeconds: number;
  }): Promise<PresignedRequest>;

  /** Signed GET; `attachmentFilename` forces a download (Content-Disposition: attachment). */
  presignGet(input: {
    key: string;
    expiresInSeconds: number;
    attachmentFilename?: string;
  }): Promise<PresignedRequest>;

  /** Metadata, or null when the object does not exist. */
  head(key: string): Promise<StoredObjectInfo | null>;

  /** First `length` bytes (default 16) for file-signature checks, pinned to `ifMatch` when given. */
  readRange(key: string, options?: { length?: number; ifMatch?: string }): Promise<Uint8Array>;

  /** Server-side copy, only if the source still has ETag `ifMatch`. */
  copy(input: {
    sourceKey: string;
    destinationKey: string;
    ifMatch: string;
  }): Promise<{ etag: string }>;

  /** Idempotent delete. */
  delete(key: string): Promise<void>;
}
