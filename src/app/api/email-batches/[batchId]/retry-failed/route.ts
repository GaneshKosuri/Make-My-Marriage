import { ok, route } from "@/server/http";
import { emailJobsService } from "@/modules/email-jobs";
import { emailBatchIdParams } from "@/modules/email-jobs/email-job.schemas";

/** /api/email-batches/[batchId]/retry-failed (POST API §86). */

/** POST — API §86: sends the batch's failed emails again. */
export const POST = route({
  auth: "member",
  params: emailBatchIdParams,
  handler: async ({ ctx, params }) => ok(await emailJobsService.retryFailed(ctx, params.batchId)),
});
