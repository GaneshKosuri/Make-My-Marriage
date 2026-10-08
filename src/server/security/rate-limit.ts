import "server-only";

import { connectToDatabase } from "@/server/db/connection";
import { AppError } from "@/server/errors";

import { RateLimitModel } from "./rate-limit.model";
import { hashToken } from "./tokens";

/**
 * Fixed-window rate limiting backed by MongoDB (`rate_limits`), no Redis
 * (SYSTEM_DESIGN §67, API_DESIGN §99).
 */

export type RateLimitScope = "ip" | "token" | "user" | "membership" | "wedding" | "global";

export interface RateLimitPolicy {
  /** Stable name; part of the counter key. Renaming a policy resets its counters. */
  readonly name: string;
  readonly limit: number;
  readonly windowMs: number;
  /** What the counter is keyed on. `token` = the `token` path param (hashed, never stored raw). */
  readonly scope: RateLimitScope;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds: number;
}

/** Atomically increments the counter for `key` and returns the new count. */
export interface RateLimitStore {
  increment(key: string, expiresAt: Date): Promise<number>;
}

const MINUTE = 60_000;

/**
 * Named policies for every endpoint in API_DESIGN §99, plus the photo issuance
 * limits from the 2026-09-18 notes.
 *
 * Limits marked "placeholder" are starting values to tune with real traffic.
 * RSVP (API §51) and photo issuance (2026-09-18) are specified by the docs.
 */
export const policies = {
  login: { name: "auth.login", limit: 10, windowMs: 15 * MINUTE, scope: "ip" }, // placeholder
  signup: { name: "auth.signup", limit: 10, windowMs: 60 * MINUTE, scope: "ip" }, // placeholder
  forgotPassword: { name: "auth.forgot-password", limit: 5, windowMs: 15 * MINUTE, scope: "ip" }, // placeholder
  resetPassword: { name: "auth.reset-password", limit: 10, windowMs: 15 * MINUTE, scope: "ip" }, // placeholder
  publicInvitationView: {
    name: "public.invitation.view",
    limit: 120,
    windowMs: MINUTE,
    scope: "ip",
  }, // placeholder
  // API §51: per-invitation first, then the shared ceiling. Use `consumeInOrder`.
  rsvpPerInvitation: {
    name: "public.rsvp.per-invitation",
    limit: 20,
    windowMs: 15 * MINUTE,
    scope: "token",
  },
  rsvpGlobal: { name: "public.rsvp.global", limit: 300, windowMs: MINUTE, scope: "global" },
  galleryUploadUrl: {
    name: "public.gallery.upload-url",
    limit: 60,
    windowMs: 15 * MINUTE,
    scope: "ip",
  }, // placeholder
  galleryPhotoConfirm: {
    name: "public.gallery.photo-confirm",
    limit: 60,
    windowMs: 15 * MINUTE,
    scope: "ip",
  }, // placeholder
  // 2026-09-18 notes: 120 per member, then 600 per wedding, per 15 minutes.
  photoUploadPerMember: {
    name: "photos.upload-url.member",
    limit: 120,
    windowMs: 15 * MINUTE,
    scope: "membership",
  },
  photoUploadPerWedding: {
    name: "photos.upload-url.wedding",
    limit: 600,
    windowMs: 15 * MINUTE,
    scope: "wedding",
  },
} as const satisfies Record<string, RateLimitPolicy>;

export type PolicyName = keyof typeof policies;

export function windowStartFor(nowMs: number, windowMs: number): number {
  return Math.floor(nowMs / windowMs) * windowMs;
}

export interface RateLimitStep {
  policy: RateLimitPolicy;
  /** Raw subject (IP, token, id). Hashed into the key, never stored. */
  subject: string;
}

export interface RateLimiterDeps {
  store: RateLimitStore;
  now?: () => number;
  hashKey?: (raw: string) => string;
}

export function createRateLimiter({
  store,
  now = () => Date.now(),
  hashKey = (raw) => hashToken("rate-limit", raw),
}: RateLimiterDeps) {
  async function consume(policy: RateLimitPolicy, subject: string): Promise<RateLimitResult> {
    const nowMs = now();
    const windowStart = windowStartFor(nowMs, policy.windowMs);
    const resetAt = new Date(windowStart + policy.windowMs);
    const key = hashKey(`${policy.name}\u0000${windowStart}\u0000${subject}`);

    const count = await store.increment(key, resetAt);
    const allowed = count <= policy.limit;
    return {
      allowed,
      limit: policy.limit,
      remaining: Math.max(0, policy.limit - count),
      resetAt,
      retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((resetAt.getTime() - nowMs) / 1000)),
    };
  }

  /**
   * Consumes each step in order and stops at the first rejection, so later
   * (shared) counters are not spent by attempts an earlier step rejected
   * (API_DESIGN §51: per-invitation before global).
   */
  async function consumeInOrder(
    steps: readonly RateLimitStep[],
  ): Promise<RateLimitResult & { policy: RateLimitPolicy | null }> {
    let last: RateLimitResult & { policy: RateLimitPolicy | null } = {
      allowed: true,
      limit: Number.POSITIVE_INFINITY,
      remaining: Number.POSITIVE_INFINITY,
      resetAt: new Date(now()),
      retryAfterSeconds: 0,
      policy: null,
    };
    for (const step of steps) {
      const result = await consume(step.policy, step.subject);
      last = { ...result, policy: step.policy };
      if (!result.allowed) break;
    }
    return last;
  }

  /** Throws RATE_LIMITED (429, with Retry-After) when any step is exhausted. */
  async function enforce(steps: readonly RateLimitStep[]): Promise<void> {
    const result = await consumeInOrder(steps);
    if (!result.allowed) {
      throw new AppError("RATE_LIMITED", undefined, {
        headers: { "Retry-After": String(result.retryAfterSeconds) },
      });
    }
  }

  return { consume, consumeInOrder, enforce };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && (error as { code?: unknown }).code === 11000
  );
}

/** Atomic `$inc` upsert. Two concurrent first hits can race on insert; retry once. */
export const mongoRateLimitStore: RateLimitStore = {
  async increment(key, expiresAt) {
    await connectToDatabase();
    for (let attempt = 0; ; attempt += 1) {
      try {
        const doc = await RateLimitModel.findOneAndUpdate(
          { _id: key },
          { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
          { upsert: true, returnDocument: "after", projection: { count: 1 }, lean: true },
        );
        return doc?.count ?? 1;
      } catch (error) {
        if (isDuplicateKeyError(error) && attempt < 2) continue;
        throw error;
      }
    }
  },
};

let defaultLimiter: RateLimiter | undefined;

export function getRateLimiter(): RateLimiter {
  defaultLimiter ??= createRateLimiter({ store: mongoRateLimitStore });
  return defaultLimiter;
}

/** Tests only. Pass `undefined` to restore the MongoDB-backed limiter. */
export function setRateLimiterForTests(limiter: RateLimiter | undefined): void {
  defaultLimiter = limiter;
}
