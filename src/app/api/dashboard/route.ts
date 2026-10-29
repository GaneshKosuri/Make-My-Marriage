import { ok, route } from "@/server/http";
import { dashboardService } from "@/modules/dashboard";

/** /api/dashboard (GET API §20). */

/** GET — countdown, summary counts, upcoming events and tasks (API §20). */
export const GET = route({
  auth: "member",
  handler: async ({ ctx }) => ok(await dashboardService.getDashboard(ctx)),
});
