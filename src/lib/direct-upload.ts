/**
 * The browser's direct PUT to storage with a signed URL (SYSTEM_DESIGN §37–40).
 * Shared by gallery photos and the wedding cover photo. Uses XMLHttpRequest
 * because fetch can't report upload progress.
 */
import { ApiError } from "./api-client";

export interface SignedPut {
  uploadUrl: string;
  /** Headers the browser must send unchanged (they are part of the signature). */
  headers: Record<string, string>;
}

export function putToStorage(
  target: SignedPut,
  body: Blob,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", target.uploadUrl);
    for (const [name, value] of Object.entries(target.headers)) {
      request.setRequestHeader(name, value);
    }
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new ApiError(request.status, "UPLOAD_ERROR", "The upload didn't finish."));
    request.onerror = () => reject(new ApiError(0, "UPLOAD_ERROR", "The upload didn't finish."));
    request.send(body);
  });
}
