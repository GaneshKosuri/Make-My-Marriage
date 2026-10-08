import "server-only";

import { AppError } from "@/server/errors";

/** Every JSON request body is capped at 8 KiB (API_DESIGN §39 notes). Uploads never go through the API. */
export const MAX_JSON_BODY_BYTES = 8 * 1024;

const JSON_CONTENT_TYPE = /^application\/(?:[\w.+-]+\+)?json(?:\s*;|$)/i;

function tooLarge(maxBytes: number): AppError {
  return new AppError("VALIDATION_ERROR", "Request body is too large.", {
    details: { body: `Must be at most ${maxBytes} bytes` },
  });
}

/**
 * Reads and parses a JSON body without ever buffering more than `maxBytes`.
 * Returns `undefined` for an empty body. Non-JSON content types are rejected,
 * which also blocks simple cross-site form posts.
 */
export async function readJsonBody(
  request: Request,
  maxBytes: number = MAX_JSON_BODY_BYTES,
): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw tooLarge(maxBytes);
  if (!request.body) return undefined;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw tooLarge(maxBytes);
    }
    chunks.push(value);
  }

  const text = new TextDecoder().decode(Buffer.concat(chunks));
  if (text.trim() === "") return undefined;

  if (!JSON_CONTENT_TYPE.test(request.headers.get("content-type") ?? "")) {
    throw new AppError("VALIDATION_ERROR", "Request body must be JSON.", {
      details: { body: "Content-Type must be application/json" },
    });
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new AppError("VALIDATION_ERROR", "Request body is not valid JSON.", {
      details: { body: "Malformed JSON" },
    });
  }
}
