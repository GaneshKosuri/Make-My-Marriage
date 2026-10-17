import { authService } from "@/modules/auth";
import { resetPasswordSchema } from "@/modules/auth/auth.schemas";
import { policies, route, success } from "@/server/http";

/** POST /api/auth/reset-password — set a new password from an emailed link (API §16). */
export const POST = route({
  auth: "public",
  body: resetPasswordSchema,
  rateLimit: policies.resetPassword,
  handler: async ({ ctx, body }) => {
    await authService.resetPassword(ctx, body);
    return success();
  },
});
