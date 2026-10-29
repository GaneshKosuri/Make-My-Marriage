import { authService } from "@/modules/auth";
import { forgotPasswordSchema } from "@/modules/auth/auth.schemas";
import { policies, route, success } from "@/server/http";

/** POST /api/auth/forgot-password — always `{ success: true }` (API §15). */
export const POST = route({
  auth: "public",
  body: forgotPasswordSchema,
  rateLimit: policies.forgotPassword,
  handler: async ({ ctx, body }) => {
    await authService.forgotPassword(ctx, body);
    return success();
  },
});
