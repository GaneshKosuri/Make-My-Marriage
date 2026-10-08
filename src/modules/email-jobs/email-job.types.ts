/** Email job DTOs (API_DESIGN §85–87). Isomorphic. */
import type { EmailJobType } from "./email-job.constants";

/** GET /api/email-batches/:batchId (API_DESIGN §85). */
export interface EmailBatchStatusDto {
  batchId: string;
  total: number;
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  cancelled: number;
  completed: boolean;
}

/** One cron run of /api/internal/jobs/email (API_DESIGN §87). */
export interface EmailWorkerRunResult {
  claimed: number;
  sent: number;
  failed: number;
}

export interface EnqueueGuestEmailsInput {
  type: EmailJobType;
  recipients: { guestId: string; recipientEmail: string }[];
}

export interface EnqueueResult {
  batchId: string;
  jobsCreated: number;
}
