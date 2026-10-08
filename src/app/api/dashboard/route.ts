import { notImplemented, route } from "@/server/http";

/**
 * /api/dashboard — stub (GET API §20).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 1: Foundation.
 */

/** GET — API §20. */
export const GET = route({
  auth: "member",
  // Phase 1: Foundation: ok(await dashboardService.getDashboard(ctx))
  handler: () => notImplemented("Phase 1: Foundation"),
});
