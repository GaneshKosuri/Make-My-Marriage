import "server-only";

import type { MemberContext } from "@/server/auth";
import { notImplemented } from "@/server/errors";

import type {
  EmailBatchStatusDto,
  EnqueueGuestEmailsInput,
  EnqueueResult,
} from "./email-job.types";

/** Organiser-facing bulk email operations (API_DESIGN §47, §49, §85–86). Phase 3. */
export const emailJobsService = {
  /** One job per recipient, shared batchId, unique idempotencyKey; returns immediately. */
  async enqueueGuestEmails(
    weddingId: string,
    input: EnqueueGuestEmailsInput,
  ): Promise<EnqueueResult> {
    return notImplemented("SYSTEM_DESIGN §49, DATABASE_DESIGN §69–70 (Phase 3: Guests)");
  },

  /** Batch must belong to ctx.weddingId (else NOT_FOUND). API §85. */
  async getBatchStatus(ctx: MemberContext, batchId: string): Promise<EmailBatchStatusDto> {
    return notImplemented("API_DESIGN §85 (Phase 3: Guests)");
  },

  /** FAILED → PENDING subject to retry policy. API §86. */
  async retryFailed(ctx: MemberContext, batchId: string): Promise<EmailBatchStatusDto> {
    return notImplemented("API_DESIGN §86 (Phase 3: Guests)");
  },

  /** Called when a guest is deleted (DATABASE_DESIGN §48). */
  async cancelPendingForGuest(weddingId: string, guestId: string): Promise<void> {
    return notImplemented("DATABASE_DESIGN §48 (Phase 3: Guests)");
  },
};
