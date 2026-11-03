import { authService } from "@/modules/auth";
import { signupSchema } from "@/modules/auth/auth.schemas";
import { created, policies, readSessionToken, route, setSessionCookie } from "@/server/http";

/** POST /api/auth/signup — create an account and sign in (API §11). */
export const POST = route({
  auth: "public",
  body: signupSchema,
  rateLimit: policies.signup,
  handler: async ({ ctx, body, request }) => {
    // A browser that was already signed in drops that session (QA 2026-11-03).
    const { body: data, session } = await authService.signup(ctx, body, readSessionToken(request));
    const response = created(data);
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  },
});
