import { notImplemented, route } from "@/server/http";
import { emailBatchIdParams } from "@/modules/email-jobs/email-job.schemas";

/**
 * /api/email-batches/[batchId] — stub (GET API §85).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 3: Guests.
 */

/** GET — API §85. */
export const GET = route({
  auth: "member",
  params: emailBatchIdParams,
  // Phase 3: Guests: ok(await emailJobsService.getBatchStatus(ctx, params.batchId))
  handler: () => notImplemented("Phase 3: Guests"),
});
