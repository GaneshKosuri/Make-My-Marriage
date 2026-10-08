import { emailJobWorker } from "@/modules/email-jobs";
import { ok, route } from "@/server/http";

/**
 * /api/internal/jobs/email — bulk email worker (SYSTEM_DESIGN §49–54, API_DESIGN §87).
 *
 * Vercel Cron calls with GET and `Authorization: Bearer <CRON_SECRET>`, so both
 * GET and POST are exported and both require the secret (binding decision 9).
 * Until Phase 3 the worker reports `{ claimed: 0, sent: 0, failed: 0 }`.
 */
const processEmailJobs = route({
  auth: "internal",
  handler: async ({ ctx }) => ok(await emailJobWorker.processDueJobs(ctx)),
});

export const GET = processEmailJobs;
export const POST = processEmailJobs;
