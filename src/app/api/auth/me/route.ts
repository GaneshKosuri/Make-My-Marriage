import { authService } from "@/modules/auth";
import { ok, route } from "@/server/http";

/** GET /api/auth/me — the signed-in user, membership and wedding (API §14). */
export const GET = route({
  auth: "user",
  handler: async ({ ctx }) => ok(await authService.me(ctx)),
});
