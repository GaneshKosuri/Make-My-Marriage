import { authService } from "@/modules/auth";
import { signupSchema } from "@/modules/auth/auth.schemas";
import { created, policies, route, setSessionCookie } from "@/server/http";

/** POST /api/auth/signup — create an account and sign in (API §11). */
export const POST = route({
  auth: "public",
  body: signupSchema,
  rateLimit: policies.signup,
  handler: async ({ ctx, body }) => {
    const { body: data, session } = await authService.signup(ctx, body);
    const response = created(data);
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  },
});
