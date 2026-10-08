import { notImplemented, route } from "@/server/http";
import { emailBatchIdParams } from "@/modules/email-jobs/email-job.schemas";

/**
 * /api/email-batches/[batchId]/retry-failed — stub (POST API §86).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 3: Guests.
 */

/** POST — API §86. */
export const POST = route({
  auth: "member",
  params: emailBatchIdParams,
  // Phase 3: Guests: ok(await emailJobsService.retryFailed(ctx, params.batchId))
  handler: () => notImplemented("Phase 3: Guests"),
});
