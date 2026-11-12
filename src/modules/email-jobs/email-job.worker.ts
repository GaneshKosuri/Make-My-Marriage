import "server-only";

import { randomUUID } from "node:crypto";

import type { InternalContext } from "@/server/auth";
import { getEnv } from "@/server/config/env";
import { isEmailQuotaError } from "@/server/email";
import { logger } from "@/server/logging/logger";

import {
  EMAIL_JOB_LAST_ERROR_MAX_LENGTH,
  EMAIL_JOB_MAX_ATTEMPTS,
  EMAIL_JOB_QUOTA_RETRY_MINUTES,
  EMAIL_JOB_RETRY_DELAYS_MINUTES,
  EMAIL_JOB_STALE_LOCK_MINUTES,
} from "./email-job.constants";
import { emailJobRepository } from "./email-job.repository";
import type { EmailWorkerRunResult } from "./email-job.types";
import { getGuestEmailPort, sendGuestEmail } from "./guest-email.port";

const MINUTE = 60_000;

/**
 * A short reason for `lastError` and the logs. SMTP replies can quote the
 * recipient, so addresses are masked.
 */
function reasonOf(error: unknown): string {
  const detail =
    error instanceof Error
      ? `${error.name}: ${error.cause instanceof Error ? error.cause.message : error.message}`
      : "Unknown error";
  return detail
    .replace(/[^\s<>()"']+@[^\s<>()"']+/g, "<address>")
    .slice(0, EMAIL_JOB_LAST_ERROR_MAX_LENGTH);
}

/**
 * Sends queued guest emails (SYSTEM_DESIGN §49–54; API_DESIGN §87). Runs from
 * the daily cron, and right after jobs are queued or while an organiser watches
 * a batch (decided 2026-11-12).
 *
 *   1. jobs whose run was interrupted go back to PENDING (or FAILED when out of attempts);
 *   2. jobs are claimed one at a time (atomic PENDING → PROCESSING with a lock id);
 *   3. each is rebuilt from the guest as it is now (deleted guests, missing
 *      addresses and guests who already replied are cancelled) and sent with
 *      the job's idempotency key;
 *   4. recorded on the guest, then SENT. A failure to record is logged, not
 *      retried: the email went out, and sending it again would duplicate it;
 *   5. otherwise a retry after 5 then 30 minutes, then FAILED. A provider's
 *      sending limit puts the job back for an hour without spending an attempt
 *      and ends the run, since the next email would be refused too.
 */
export const emailJobWorker = {
  async processDueJobs(
    ctx: InternalContext,
    options: { batchSize?: number; deadline?: number } = {},
  ): Promise<EmailWorkerRunResult> {
    const batchSize = options.batchSize ?? getEnv().EMAIL_BATCH_SIZE;
    const deadline = options.deadline ?? Number.POSITIVE_INFINITY;
    const lockId = randomUUID();
    const port = getGuestEmailPort();
    const result: EmailWorkerRunResult = { claimed: 0, sent: 0, failed: 0 };

    const start = new Date();
    await emailJobRepository.recoverStale(
      new Date(start.getTime() - EMAIL_JOB_STALE_LOCK_MINUTES * MINUTE),
      start,
    );

    while (result.claimed < batchSize && Date.now() < deadline) {
      const job = await emailJobRepository.claimNext(lockId, new Date());
      if (!job) break;
      result.claimed += 1;
      const jobId = job._id.toString();

      try {
        const email = await port.compose(job);
        if (!email) {
          await emailJobRepository.markCancelled(jobId, lockId, "No longer applies");
          continue;
        }
        const delivery = await sendGuestEmail(email, job.idempotencyKey);
        const sentAt = new Date();
        // On the guest first, so a finished job always shows on the guest list.
        try {
          await port.delivered(job, sentAt);
        } catch (error) {
          // The guest may still read "not sent"; the job says SENT (review P4, decided 2026-11-12).
          logger.warn("Email sent but not recorded on the guest", {
            requestId: ctx.requestId,
            jobId,
            reason: reasonOf(error),
          });
        }
        await emailJobRepository.markSent(jobId, lockId, delivery.providerMessageId, sentAt);
        result.sent += 1;
      } catch (error) {
        if (isEmailQuotaError(error)) {
          await emailJobRepository.defer(
            jobId,
            lockId,
            new Date(Date.now() + EMAIL_JOB_QUOTA_RETRY_MINUTES * MINUTE),
            reasonOf(error),
          );
          logger.warn("Email sending limit reached; queued emails wait an hour", {
            requestId: ctx.requestId,
            jobId,
          });
          break;
        }
        const attempt = job.attempts + 1;
        const delay = EMAIL_JOB_RETRY_DELAYS_MINUTES[attempt];
        const nextAttemptAt =
          attempt < EMAIL_JOB_MAX_ATTEMPTS && delay !== undefined
            ? new Date(Date.now() + delay * MINUTE)
            : null;
        await emailJobRepository.markAttemptFailed(jobId, lockId, reasonOf(error), nextAttemptAt);
        result.failed += 1;
        logger.warn("Email job attempt failed", {
          requestId: ctx.requestId,
          jobId,
          attempt,
          retrying: nextAttemptAt !== null,
          reason: reasonOf(error),
        });
      }
    }

    if (result.claimed > 0) {
      logger.info("Email jobs processed", { requestId: ctx.requestId, ...result });
    }
    return result;
  },
};
