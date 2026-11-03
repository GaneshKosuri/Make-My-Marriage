import { authService } from "@/modules/auth";
import { loginSchema } from "@/modules/auth/auth.schemas";
import { ok, policies, readSessionToken, route, setSessionCookie } from "@/server/http";

/** POST /api/auth/login — email + password sign-in (API §12). */
export const POST = route({
  auth: "public",
  body: loginSchema,
  rateLimit: policies.login,
  handler: async ({ ctx, body, request }) => {
    // A browser that was already signed in drops that session.
    const { body: data, session } = await authService.login(ctx, body, readSessionToken(request));
    const response = ok(data);
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  },
});
