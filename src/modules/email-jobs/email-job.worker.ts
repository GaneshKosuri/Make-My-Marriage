import "server-only";

import type { InternalContext } from "@/server/auth";

import type { EmailWorkerRunResult } from "./email-job.types";

/**
 * Cron worker behind /api/internal/jobs/email (SYSTEM_DESIGN §49–54; API_DESIGN §87).
 *
 * Phase 3 flow:
 *   1. emailJobRepository.recoverStale(now − EMAIL_JOB_STALE_LOCK_MINUTES)
 *   2. claim up to `batchSize` jobs one at a time (atomic PENDING → PROCESSING, lockId)
 *   3. render + send each through getEmailService() with the job's idempotencyKey
 *   4. markSent, or markAttemptFailed with EMAIL_JOB_RETRY_DELAYS_MINUTES / FAILED
 *
 * Until then it reports an empty run without touching the database.
 */
export const emailJobWorker = {
  async processDueJobs(
    ctx: InternalContext,
    options: { batchSize: number },
  ): Promise<EmailWorkerRunResult> {
    // TODO(Phase 3: Guests): implement the flow above.
    return { claimed: 0, sent: 0, failed: 0 };
  },
};
