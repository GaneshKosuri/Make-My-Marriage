import "server-only";

import { connectToDatabase } from "@/server/db/connection";
import { isDuplicateKeyError } from "@/server/db/errors";
import { toObjectId } from "@/server/db/object-id";

import {
  ACTIVE_EMAIL_JOB_STATUSES as ACTIVE,
  EMAIL_JOB_MAX_ATTEMPTS,
  type EmailJobStatus,
  type EmailJobType,
} from "./email-job.constants";
import { EmailJobModel, type EmailJobDoc, type EmailJobRecord } from "./email-job.model";

/** The worker's reads and writes cross weddings: the documented tenant-guard opt-out. */
const ACROSS_WEDDINGS = { tenantScoped: false } as const;

/** A lock held by one worker run; other runs can't touch the job meanwhile. */
const locked = (jobId: string, lockId: string) => ({
  _id: toObjectId(jobId, "jobId"),
  lockId,
  status: "PROCESSING" as const,
});
const unlock = { lockId: null, lockedAt: null };

/**
 * Data access for `email_jobs`. `weddingId` first for organiser operations;
 * the worker functions (claim/recover/mark*) are the documented cross-wedding
 * opt-out from the tenant guard.
 */
export const emailJobRepository = {
  /**
   * Inserts what it can (DATABASE_DESIGN §87: no giant transaction). A job
   * whose idempotency key already exists, or for a guest who already has one
   * of the same kind on its way (the active-job unique index), is skipped.
   */
  async insertMany(
    weddingId: string,
    jobs: Omit<EmailJobDoc, "weddingId" | "createdAt" | "updatedAt">[],
  ): Promise<number> {
    if (jobs.length === 0) return 0;
    await connectToDatabase();
    const wedding = toObjectId(weddingId, "weddingId");
    try {
      const inserted = await EmailJobModel.insertMany(
        jobs.map((job) => ({ ...job, weddingId: wedding })),
        { ordered: false },
      );
      return inserted.length;
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      const { insertedDocs } = error as { insertedDocs?: unknown[] };
      return insertedDocs?.length ?? 0;
    }
  },

  /** Every guest of the wedding with an email of each kind waiting or being sent. */
  async guestsWithActiveJobs(weddingId: string): Promise<Record<EmailJobType, string[]>> {
    await connectToDatabase();
    const rows = await EmailJobModel.aggregate<{ _id: EmailJobType; guestIds: unknown[] }>([
      { $match: { weddingId: toObjectId(weddingId, "weddingId"), status: { $in: ACTIVE } } },
      { $group: { _id: "$type", guestIds: { $addToSet: "$guestId" } } },
    ]).exec();
    const byType: Record<EmailJobType, string[]> = { GUEST_INVITATION: [], RSVP_REMINDER: [] };
    for (const row of rows) byType[row._id] = row.guestIds.map(String);
    return byType;
  },

  /** Guests among `guestIds` that already have a job of `type` waiting or being sent. */
  async findGuestsWithActiveJobs(
    weddingId: string,
    type: EmailJobType,
    guestIds: readonly string[],
  ): Promise<Set<string>> {
    if (guestIds.length === 0) return new Set();
    await connectToDatabase();
    const ids = await EmailJobModel.distinct("guestId", {
      weddingId: toObjectId(weddingId, "weddingId"),
      type,
      status: { $in: ACTIVE },
      guestId: { $in: guestIds.map((id) => toObjectId(id, "guestId")) },
    }).exec();
    return new Set(ids.map((id) => id.toString()));
  },

  async countByStatusForBatch(
    weddingId: string,
    batchId: string,
  ): Promise<Partial<Record<EmailJobStatus, number>>> {
    await connectToDatabase();
    const rows = await EmailJobModel.aggregate<{ _id: EmailJobStatus; count: number }>([
      { $match: { weddingId: toObjectId(weddingId, "weddingId"), batchId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).exec();
    return Object.fromEntries(rows.map((row) => [row._id, row.count]));
  },

  /**
   * FAILED jobs of the batch start again with a fresh set of attempts
   * (API_DESIGN §86), one by one. A job whose guest has since had the same
   * kind of email queued again, or sent by a later job, is CANCELLED instead:
   * retrying it would email them twice (review P5).
   */
  async requeueFailed(
    weddingId: string,
    batchId: string,
    now: Date,
  ): Promise<{ requeued: number; superseded: number }> {
    await connectToDatabase();
    const wedding = toObjectId(weddingId, "weddingId");
    const failed = await EmailJobModel.find({ weddingId: wedding, batchId, status: "FAILED" })
      .select({ guestId: 1, type: 1, createdAt: 1 })
      .lean<Pick<EmailJobRecord, "_id" | "guestId" | "type" | "createdAt">[]>()
      .exec();
    const outcome = { requeued: 0, superseded: 0 };
    for (const job of failed) {
      const failedJob = { weddingId: wedding, _id: job._id, status: "FAILED" as const };
      const later = await EmailJobModel.exists({
        weddingId: wedding,
        guestId: job.guestId,
        type: job.type,
        _id: { $ne: job._id },
        $or: [{ status: { $in: ACTIVE } }, { status: "SENT", createdAt: { $gt: job.createdAt } }],
      }).exec();
      if (!later) {
        try {
          const result = await EmailJobModel.updateOne(failedJob, {
            $set: {
              status: "PENDING",
              attempts: 0,
              nextAttemptAt: now,
              lastError: null,
              ...unlock,
            },
          }).exec();
          outcome.requeued += result.modifiedCount;
          continue;
        } catch (error) {
          // Queued again meanwhile: the active-job unique index refused this one.
          if (!isDuplicateKeyError(error)) throw error;
        }
      }
      const result = await EmailJobModel.updateOne(failedJob, {
        $set: { status: "CANCELLED", lastError: "Sent or queued again by a later send" },
      }).exec();
      outcome.superseded += result.modifiedCount;
    }
    return outcome;
  },

  /** Jobs not yet picked up become CANCELLED; one already being sent is left to finish. */
  async cancelPendingForGuest(weddingId: string, guestId: string): Promise<number> {
    await connectToDatabase();
    const result = await EmailJobModel.updateMany(
      {
        weddingId: toObjectId(weddingId, "weddingId"),
        guestId: toObjectId(guestId, "guestId"),
        status: "PENDING",
      },
      { $set: { status: "CANCELLED" } },
    ).exec();
    return result.modifiedCount;
  },

  // ── Worker (cross-wedding; tenant-guard opt-out) ─────────────────────────

  /**
   * PROCESSING jobs whose run stopped before finishing (DATABASE_DESIGN §73).
   * The interrupted send counts as an attempt; a job out of attempts fails.
   */
  async recoverStale(staleBefore: Date, now: Date): Promise<number> {
    await connectToDatabase();
    const stale = { status: "PROCESSING" as const, lockedAt: { $lt: staleBefore } };
    const failed = await EmailJobModel.updateMany(
      { ...stale, attempts: { $gte: EMAIL_JOB_MAX_ATTEMPTS - 1 } },
      {
        $set: { status: "FAILED", lastError: "Interrupted while sending", ...unlock },
        $inc: { attempts: 1 },
      },
    )
      .setOptions(ACROSS_WEDDINGS)
      .exec();
    const retried = await EmailJobModel.updateMany(stale, {
      $set: { status: "PENDING", nextAttemptAt: now, ...unlock },
      $inc: { attempts: 1 },
    })
      .setOptions(ACROSS_WEDDINGS)
      .exec();
    return failed.modifiedCount + retried.modifiedCount;
  },

  /**
   * Atomically takes the oldest due PENDING job (DATABASE_DESIGN §72), so
   * overlapping runs never send the same email twice.
   */
  async claimNext(lockId: string, now: Date): Promise<EmailJobRecord | null> {
    await connectToDatabase();
    return EmailJobModel.findOneAndUpdate(
      { status: "PENDING", nextAttemptAt: { $lte: now } },
      { $set: { status: "PROCESSING", lockedAt: now, lockId } },
      { sort: { nextAttemptAt: 1, createdAt: 1 }, returnDocument: "after" },
    )
      .setOptions(ACROSS_WEDDINGS)
      .lean<EmailJobRecord>()
      .exec();
  },

  async markSent(
    jobId: string,
    lockId: string,
    providerMessageId: string | null,
    sentAt: Date,
  ): Promise<void> {
    await connectToDatabase();
    await EmailJobModel.updateOne(locked(jobId, lockId), {
      $set: { status: "SENT", sentAt, providerMessageId, lastError: null, ...unlock },
      $inc: { attempts: 1 },
    })
      .setOptions(ACROSS_WEDDINGS)
      .exec();
  },

  /**
   * Counts the attempt and schedules the next one, or marks the job FAILED
   * when `nextAttemptAt` is null (DATABASE_DESIGN §74).
   */
  async markAttemptFailed(
    jobId: string,
    lockId: string,
    error: string,
    nextAttemptAt: Date | null,
  ): Promise<void> {
    await connectToDatabase();
    await EmailJobModel.updateOne(locked(jobId, lockId), {
      $set: {
        status: nextAttemptAt ? "PENDING" : "FAILED",
        ...(nextAttemptAt && { nextAttemptAt }),
        lastError: error,
        ...unlock,
      },
      $inc: { attempts: 1 },
    })
      .setOptions(ACROSS_WEDDINGS)
      .exec();
  },

  /** The provider's sending limit: back to PENDING later, without spending an attempt. */
  async defer(jobId: string, lockId: string, nextAttemptAt: Date, reason: string): Promise<void> {
    await connectToDatabase();
    await EmailJobModel.updateOne(locked(jobId, lockId), {
      $set: { status: "PENDING", nextAttemptAt, lastError: reason, ...unlock },
    })
      .setOptions(ACROSS_WEDDINGS)
      .exec();
  },

  /** The email no longer applies (guest deleted, no address, already replied). */
  async markCancelled(jobId: string, lockId: string, reason: string): Promise<void> {
    await connectToDatabase();
    await EmailJobModel.updateOne(locked(jobId, lockId), {
      $set: { status: "CANCELLED", lastError: reason, ...unlock },
    })
      .setOptions(ACROSS_WEDDINGS)
      .exec();
  },
};
