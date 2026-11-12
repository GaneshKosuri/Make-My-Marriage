import "server-only";

import { randomBytes, randomUUID } from "node:crypto";

import type { MemberContext } from "@/server/auth";
import { toObjectId } from "@/server/db/object-id";
import { AppError } from "@/server/errors";
import { runAfterResponse } from "@/server/http/after-response";
import { logger } from "@/server/logging/logger";

import type { EmailJobType } from "./email-job.constants";
import { toEmailBatchStatusDto } from "./email-job.mapper";
import { emailJobRepository } from "./email-job.repository";
import type {
  EmailBatchStatusDto,
  EnqueueGuestEmailsInput,
  EnqueueResult,
} from "./email-job.types";
import { emailJobWorker } from "./email-job.worker";

/**
 * How long one background run may keep sending after a response, well inside
 * a serverless function's time limit. What is left waits for the next run.
 */
const BACKGROUND_RUN_MS = 45_000;

/** Sends what is due, after the response is out (decided 2026-11-12). */
function processSoon(reason: string): void {
  runAfterResponse(`email-jobs:${reason}`, () =>
    emailJobWorker.processDueJobs(
      { requestId: randomUUID() },
      { deadline: Date.now() + BACKGROUND_RUN_MS },
    ),
  );
}

async function batchStatus(weddingId: string, batchId: string): Promise<EmailBatchStatusDto> {
  const counts = await emailJobRepository.countByStatusForBatch(weddingId, batchId);
  const status = toEmailBatchStatusDto(batchId, counts);
  // Unknown, empty and other weddings' batches look the same.
  if (status.total === 0) throw new AppError("NOT_FOUND");
  return status;
}

/** Organiser-facing bulk email operations (API_DESIGN §47, §49, §85–86). */
export const emailJobsService = {
  /**
   * One job per recipient under a new batch id, then returns at once; sending
   * starts after the response. A guest who already has the same kind of email
   * waiting is skipped, so pressing the button twice, or two organisers
   * sending at once (the active-job unique index), doesn't email them twice.
   */
  async enqueueGuestEmails(
    weddingId: string,
    input: EnqueueGuestEmailsInput,
  ): Promise<EnqueueResult> {
    const batchId = randomBytes(16).toString("base64url");
    const waiting = await emailJobRepository.findGuestsWithActiveJobs(
      weddingId,
      input.type,
      input.recipients.map((recipient) => recipient.guestId),
    );
    const now = new Date();
    const jobsCreated = await emailJobRepository.insertMany(
      weddingId,
      input.recipients
        .filter((recipient) => !waiting.has(recipient.guestId))
        .map((recipient) => ({
          type: input.type,
          guestId: toObjectId(recipient.guestId, "guestId"),
          recipientEmail: recipient.recipientEmail,
          status: "PENDING" as const,
          batchId,
          idempotencyKey: `${input.type}:${recipient.guestId}:${batchId}`,
          attempts: 0,
          nextAttemptAt: now,
          lockedAt: null,
          lockId: null,
          sentAt: null,
          providerMessageId: null,
          lastError: null,
        })),
    );
    logger.info("Guest emails queued", { weddingId, type: input.type, batchId, jobsCreated });
    if (jobsCreated > 0) processSoon("queued");
    return { batchId, jobsCreated };
  },

  /**
   * Batch must belong to ctx.weddingId (else NOT_FOUND). While anything is
   * waiting, each check also keeps the sending going. API §85.
   */
  async getBatchStatus(ctx: MemberContext, batchId: string): Promise<EmailBatchStatusDto> {
    const status = await batchStatus(ctx.weddingId, batchId);
    if (status.pending > 0 && status.processing === 0) processSoon("batch-status");
    return status;
  },

  /**
   * FAILED → PENDING with fresh attempts, then sends them; those already sent
   * or queued again by a later send are cancelled instead. API §86.
   */
  async retryFailed(ctx: MemberContext, batchId: string): Promise<EmailBatchStatusDto> {
    await batchStatus(ctx.weddingId, batchId);
    const { requeued, superseded } = await emailJobRepository.requeueFailed(
      ctx.weddingId,
      batchId,
      new Date(),
    );
    logger.info("Failed guest emails requeued", {
      requestId: ctx.requestId,
      weddingId: ctx.weddingId,
      batchId,
      requeued,
      superseded,
    });
    if (requeued > 0) processSoon("retry");
    return batchStatus(ctx.weddingId, batchId);
  },

  /** Guests with an invitation or reminder already on its way, by type. */
  async guestsWithQueuedEmails(weddingId: string): Promise<Record<EmailJobType, string[]>> {
    return emailJobRepository.guestsWithActiveJobs(weddingId);
  },

  /** Called when a guest is deleted (DATABASE_DESIGN §48). */
  async cancelPendingForGuest(weddingId: string, guestId: string): Promise<number> {
    return emailJobRepository.cancelPendingForGuest(weddingId, guestId);
  },
};
