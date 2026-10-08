import "server-only";

import type { CreatedSession, PublicContext, UserContext } from "@/server/auth";
import { notImplemented } from "@/server/errors";

import type {
  AuthResultDto,
  ForgotPasswordInput,
  LoginInput,
  MeDto,
  ResetPasswordInput,
  SignupInput,
} from "./auth.types";

/** A result plus the new session; the route handler sets the cookie. */
export interface AuthenticatedResult {
  body: AuthResultDto;
  session: CreatedSession;
}

/**
 * Authentication use cases (PRD §9.1, SYSTEM_DESIGN §8–12, API_DESIGN §11–16).
 * Phase 1: Foundation.
 */
export const authService = {
  /** Normalise email → reject duplicates (EMAIL_ALREADY_EXISTS) → argon2id → user → session. API §11. */
  async signup(ctx: PublicContext, input: SignupInput): Promise<AuthenticatedResult> {
    return notImplemented("API_DESIGN §11 (Phase 1: Foundation)");
  },

  /** Generic "Invalid email or password." on failure; use verifyPasswordOrBurn. API §12. */
  async login(ctx: PublicContext, input: LoginInput): Promise<AuthenticatedResult> {
    return notImplemented("API_DESIGN §12 (Phase 1: Foundation)");
  },

  /** Destroys the current session; the handler clears the cookie. API §13. */
  async logout(ctx: UserContext, rawSessionToken: string | null): Promise<void> {
    return notImplemented("API_DESIGN §13 (Phase 1: Foundation)");
  },

  /** Current user + membership + wedding summary. API §14. */
  async me(ctx: UserContext): Promise<MeDto> {
    return notImplemented("API_DESIGN §14 (Phase 1: Foundation)");
  },

  /** Always succeeds outwardly; emails a single-use link only if the account exists. API §15. */
  async forgotPassword(ctx: PublicContext, input: ForgotPasswordInput): Promise<void> {
    return notImplemented("API_DESIGN §15 (Phase 1: Foundation)");
  },

  /** INVALID_TOKEN / TOKEN_EXPIRED; marks token used; may revoke all sessions. API §16. */
  async resetPassword(ctx: PublicContext, input: ResetPasswordInput): Promise<void> {
    return notImplemented("API_DESIGN §16 (Phase 1: Foundation)");
  },
};
