import "server-only";

import { notImplemented } from "@/server/errors";

import type { EmailJobStatus } from "./email-job.constants";
import type { EmailJobDoc, EmailJobRecord } from "./email-job.model";

/**
 * Data access for `email_jobs`. `weddingId` first for organiser operations;
 * the worker functions (claim/recover/mark*) are the documented cross-wedding
 * opt-out from the tenant guard.
 */
export const emailJobRepository = {
  /** insertMany with idempotency-key uniqueness; no giant transaction (DATABASE_DESIGN §87). */
  async insertMany(
    weddingId: string,
    jobs: Omit<EmailJobDoc, "weddingId" | "createdAt" | "updatedAt">[],
  ): Promise<number> {
    return notImplemented("DATABASE_DESIGN §87 (Phase 3: Guests)");
  },

  async countByStatusForBatch(
    weddingId: string,
    batchId: string,
  ): Promise<Partial<Record<EmailJobStatus, number>>> {
    return notImplemented("API_DESIGN §85 (Phase 3: Guests)");
  },

  async requeueFailed(weddingId: string, batchId: string, now: Date): Promise<number> {
    return notImplemented("API_DESIGN §86 (Phase 3: Guests)");
  },

  async cancelPendingForGuest(weddingId: string, guestId: string): Promise<number> {
    return notImplemented("DATABASE_DESIGN §48 (Phase 3: Guests)");
  },

  // ── Worker (cross-wedding; tenant-guard opt-out) ─────────────────────────

  /** PROCESSING with lockedAt older than the stale threshold → PENDING. */
  async recoverStale(staleBefore: Date): Promise<number> {
    return notImplemented("DATABASE_DESIGN §73 (Phase 3: Guests)");
  },

  /** Atomic findOneAndUpdate PENDING (nextAttemptAt ≤ now) → PROCESSING with lockId. */
  async claimNext(lockId: string, now: Date): Promise<EmailJobRecord | null> {
    return notImplemented("DATABASE_DESIGN §72 (Phase 3: Guests)");
  },

  async markSent(jobId: string, lockId: string, providerMessageId: string | null): Promise<void> {
    return notImplemented("DATABASE_DESIGN §67 (Phase 3: Guests)");
  },

  /** Schedules the next attempt, or FAILED after the last one. */
  async markAttemptFailed(
    jobId: string,
    lockId: string,
    error: string,
    nextAttemptAt: Date | null,
  ): Promise<void> {
    return notImplemented("DATABASE_DESIGN §74 (Phase 3: Guests)");
  },
};
