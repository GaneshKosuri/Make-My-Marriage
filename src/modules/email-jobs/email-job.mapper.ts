import "server-only";

import type { EmailJobStatus } from "./email-job.constants";
import type { EmailBatchStatusDto } from "./email-job.types";

/**
 * Status counts → EmailBatchStatusDto (API_DESIGN §85). Recipient emails and
 * provider errors are never exposed to the client.
 */
export function toEmailBatchStatusDto(
  batchId: string,
  counts: Partial<Record<EmailJobStatus, number>>,
): EmailBatchStatusDto {
  const pending = counts.PENDING ?? 0;
  const processing = counts.PROCESSING ?? 0;
  const sent = counts.SENT ?? 0;
  const failed = counts.FAILED ?? 0;
  const cancelled = counts.CANCELLED ?? 0;
  return {
    batchId,
    total: pending + processing + sent + failed + cancelled,
    pending,
    processing,
    sent,
    failed,
    cancelled,
    completed: pending + processing === 0,
  };
}
