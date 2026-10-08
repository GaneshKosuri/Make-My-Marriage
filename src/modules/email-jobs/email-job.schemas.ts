/** Email batch request schemas (Zod, `.strict()`). Isomorphic. */
import { z } from "zod";

import { EMAIL_BATCH_ID_PATTERN } from "./email-job.constants";

export const emailBatchIdParams = z
  .object({ batchId: z.string().regex(EMAIL_BATCH_ID_PATTERN, "Invalid batch id") })
  .strict();

/*
 * TODO(Phase 3: Guests): no request bodies are needed for
 *   GET  /api/email-batches/:batchId               (API_DESIGN §85)
 *   POST /api/email-batches/:batchId/retry-failed  (API_DESIGN §86)
 */
