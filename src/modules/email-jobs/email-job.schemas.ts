/** Email batch request schemas (Zod, `.strict()`). Isomorphic. */
import { z } from "zod";

import { EMAIL_BATCH_ID_PATTERN } from "./email-job.constants";

export const emailBatchIdParams = z
  .object({ batchId: z.string().regex(EMAIL_BATCH_ID_PATTERN, "Invalid batch id") })
  .strict();
