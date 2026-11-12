import { emailJobWorker } from "@/modules/email-jobs";
import { ok, route } from "@/server/http";

/**
 * /api/internal/jobs/email — bulk email worker (SYSTEM_DESIGN §49–54, API_DESIGN §87).
 *
 * Vercel Cron calls with GET and `Authorization: Bearer <CRON_SECRET>`, so both
 * GET and POST are exported and both require the secret (binding decision 9).
 * Bulk sends also start the worker right after queueing (decided 2026-11-12);
 * this daily run is the safety net.
 */
const processEmailJobs = route({
  auth: "internal",
  handler: async ({ ctx }) => ok(await emailJobWorker.processDueJobs(ctx)),
});

export const GET = processEmailJobs;
export const POST = processEmailJobs;
