import "server-only";

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { AppError } from "@/server/errors";
import { logger } from "@/server/logging/logger";

import type { StorageService } from "../types";

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

const DEFAULT_SIGNATURE_BYTES = 16;

function httpStatusOf(error: unknown): number | undefined {
  return (error as { $metadata?: { httpStatusCode?: number } } | undefined)?.$metadata
    ?.httpStatusCode;
}

/** Provider detail goes to logs (no keys, credentials or signed URLs); callers get a generic error. */
function storageUnavailable(operation: string, error: unknown): AppError {
  logger.error("Object storage operation failed", {
    operation,
    providerStatus: httpStatusOf(error),
    errorName: (error as { name?: string } | undefined)?.name,
  });
  return new AppError("EXTERNAL_SERVICE_ERROR", "Photo storage is temporarily unavailable.", {
    cause: error,
  });
}

function attachmentDisposition(filename: string): string {
  const safe = filename.replace(/[\r\n"\\/]/g, "_").slice(0, 150) || "photo";
  const ascii = safe.replace(/[^\x20-\x7e]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}

/** Cloudflare R2 through its S3-compatible API (private bucket, bucket-scoped credentials). */
export function createR2StorageAdapter(config: R2Config): StorageService {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  const Bucket = config.bucket;

  return {
    adapterName: "r2",

    async presignPut({ key, contentType, contentLength, expiresInSeconds }) {
      try {
        const url = await getSignedUrl(
          client,
          new PutObjectCommand({
            Bucket,
            Key: key,
            ContentType: contentType,
            ContentLength: contentLength,
          }),
          {
            expiresIn: expiresInSeconds,
            signableHeaders: new Set(["content-type", "content-length"]),
          },
        );
        return {
          url,
          method: "PUT",
          expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
          headers: { "Content-Type": contentType },
        };
      } catch (error) {
        throw storageUnavailable("presignPut", error);
      }
    },

    async presignGet({ key, expiresInSeconds, attachmentFilename }) {
      try {
        const url = await getSignedUrl(
          client,
          new GetObjectCommand({
            Bucket,
            Key: key,
            ...(attachmentFilename
              ? { ResponseContentDisposition: attachmentDisposition(attachmentFilename) }
              : {}),
          }),
          { expiresIn: expiresInSeconds },
        );
        return {
          url,
          method: "GET",
          expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
          headers: {},
        };
      } catch (error) {
        throw storageUnavailable("presignGet", error);
      }
    },

    async head(key) {
      try {
        const result = await client.send(new HeadObjectCommand({ Bucket, Key: key }));
        return {
          key,
          sizeBytes: result.ContentLength ?? 0,
          contentType: result.ContentType ?? null,
          etag: result.ETag ?? "",
        };
      } catch (error) {
        if (httpStatusOf(error) === 404) return null;
        throw storageUnavailable("head", error);
      }
    },

    async readRange(key, { length = DEFAULT_SIGNATURE_BYTES, ifMatch } = {}) {
      try {
        const result = await client.send(
          new GetObjectCommand({
            Bucket,
            Key: key,
            Range: `bytes=0-${length - 1}`,
            IfMatch: ifMatch,
          }),
        );
        return (await result.Body?.transformToByteArray()) ?? new Uint8Array();
      } catch (error) {
        const status = httpStatusOf(error);
        if (status === 404 || status === 412) {
          throw new AppError("UPLOAD_ERROR", undefined, { cause: error });
        }
        throw storageUnavailable("readRange", error);
      }
    },

    async copy({ sourceKey, destinationKey, ifMatch }) {
      try {
        const result = await client.send(
          new CopyObjectCommand({
            Bucket,
            Key: destinationKey,
            CopySource: `${Bucket}/${encodeURI(sourceKey)}`,
            CopySourceIfMatch: ifMatch,
            MetadataDirective: "COPY",
          }),
        );
        return { etag: result.CopyObjectResult?.ETag ?? "" };
      } catch (error) {
        const status = httpStatusOf(error);
        if (status === 404 || status === 412) {
          throw new AppError("UPLOAD_ERROR", undefined, { cause: error });
        }
        throw storageUnavailable("copy", error);
      }
    },

    async delete(key) {
      try {
        await client.send(new DeleteObjectCommand({ Bucket, Key: key }));
      } catch (error) {
        if (httpStatusOf(error) === 404) return;
        throw storageUnavailable("delete", error);
      }
    },
  };
}
