import { authService } from "@/modules/auth";
import { loginSchema } from "@/modules/auth/auth.schemas";
import { ok, policies, route, setSessionCookie } from "@/server/http";

/** POST /api/auth/login — email + password sign-in (API §12). */
export const POST = route({
  auth: "public",
  body: loginSchema,
  rateLimit: policies.login,
  handler: async ({ ctx, body }) => {
    const { body: data, session } = await authService.login(ctx, body);
    const response = ok(data);
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  },
});
