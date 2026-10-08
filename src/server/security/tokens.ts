import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { getEnv } from "@/server/config/env";

/**
 * Secret tokens (DATABASE_DESIGN §98–99, binding decisions 1–3).
 *
 * - Every token is 32 bytes from crypto.randomBytes, base64url-encoded (43 chars).
 * - Session, password-reset and member-invite tokens (and rate-limit keys) are
 *   persisted only as HMAC-SHA-256 hashes keyed by SESSION_SECRET. Each use has
 *   its own purpose label, so a hash for one purpose is useless for another.
 * - Guest invitation and gallery tokens are stored raw (select:false) so share
 *   links and printed QR codes can be reconstructed (API_DESIGN §44, §108).
 */

export const TOKEN_BYTES = 32;
export const TOKEN_LENGTH = 43;
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export const TOKEN_PURPOSES = ["session", "password-reset", "member-invite", "rate-limit"] as const;
export type TokenPurpose = (typeof TOKEN_PURPOSES)[number];

/** A new high-entropy, URL-safe secret. Never use Math.random for this. */
export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function isWellFormedToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

export type TokenHasher = (purpose: TokenPurpose, raw: string) => string;

/**
 * Builds a hasher with one derived HMAC key per purpose:
 *   key(purpose) = HMAC(secret, "mmm:token:v1:" + purpose)
 *   hash         = HMAC(key(purpose), raw)  → base64url
 */
export function createTokenHasher(secret: string): TokenHasher {
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("The token hashing secret must be at least 32 bytes");
  }
  const purposeKeys = new Map<TokenPurpose, Buffer>();
  const keyFor = (purpose: TokenPurpose): Buffer => {
    let key = purposeKeys.get(purpose);
    if (!key) {
      key = createHmac("sha256", secret).update(`mmm:token:v1:${purpose}`).digest();
      purposeKeys.set(purpose, key);
    }
    return key;
  };
  return (purpose, raw) =>
    createHmac("sha256", keyFor(purpose)).update(raw, "utf8").digest("base64url");
}

let defaultHasher: { secret: string; hash: TokenHasher } | undefined;

/** HMAC-SHA-256 of `raw` for `purpose`, keyed by SESSION_SECRET. */
export function hashToken(purpose: TokenPurpose, raw: string): string {
  const { SESSION_SECRET } = getEnv();
  if (defaultHasher?.secret !== SESSION_SECRET) {
    defaultHasher = { secret: SESSION_SECRET, hash: createTokenHasher(SESSION_SECRET) };
  }
  return defaultHasher.hash(purpose, raw);
}

/** Constant-time string comparison (lengths are hidden by hashing first). */
export function safeEqual(a: string, b: string): boolean {
  const digestA = createHash("sha256").update(a, "utf8").digest();
  const digestB = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(digestA, digestB);
}
