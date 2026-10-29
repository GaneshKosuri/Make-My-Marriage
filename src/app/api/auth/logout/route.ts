import { authService } from "@/modules/auth";
import { clearSessionCookie, readSessionToken, route, success } from "@/server/http";

/** POST /api/auth/logout — end this session and clear the cookie (API §13). */
export const POST = route({
  auth: "user",
  handler: async ({ ctx, request }) => {
    await authService.logout(ctx, readSessionToken(request));
    const response = success();
    clearSessionCookie(response);
    return response;
  },
});
