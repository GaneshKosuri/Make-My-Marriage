import { ok, route } from "@/server/http";
import { emailJobsService } from "@/modules/email-jobs";
import { emailBatchIdParams } from "@/modules/email-jobs/email-job.schemas";

/** /api/email-batches/[batchId] (GET API §85). */

/** GET — API §85: how far a bulk send has got; another wedding's batch is NOT_FOUND. */
export const GET = route({
  auth: "member",
  params: emailBatchIdParams,
  handler: async ({ ctx, params }) =>
    ok(await emailJobsService.getBatchStatus(ctx, params.batchId)),
});
