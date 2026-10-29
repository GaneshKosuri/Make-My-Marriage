import "server-only";

import { normalizeEmail } from "@/lib/email";
import {
  createSession,
  destroyAllSessionsForUser,
  destroySession,
  type CreatedSession,
  type PublicContext,
  type UserContext,
} from "@/server/auth";
import { getEnv } from "@/server/config/env";
import { getEmailService } from "@/server/email";
import { AppError } from "@/server/errors";
import { runAfterResponse } from "@/server/http/after-response";
import { logger } from "@/server/logging/logger";
import { hashPassword, verifyPasswordOrBurn } from "@/server/security/password";
import { generateToken, hashToken, isWellFormedToken } from "@/server/security/tokens";

import { PASSWORD_RESET_TTL_MINUTES } from "./auth.constants";
import { toAuthResultDto, toMeDto } from "./auth.mapper";
import type {
  AuthResultDto,
  ForgotPasswordInput,
  LoginInput,
  MeDto,
  ResetPasswordInput,
  SignupInput,
} from "./auth.types";
import { passwordResetTokenRepository } from "./password-reset-token.repository";
import { userRepository } from "./user.repository";
import { findWeddingContext } from "./wedding-context";

/** A result plus the new session; the route handler sets the cookie. */
export interface AuthenticatedResult {
  body: AuthResultDto;
  session: CreatedSession;
}

const INVALID_CREDENTIALS = "Invalid email or password.";
const MS_PER_MINUTE = 60_000;

/**
 * Authentication use cases (PRD §9.1, SYSTEM_DESIGN §8–12, API_DESIGN §11–16).
 */
export const authService = {
  /** API §11. No email verification (PRD §9.1). */
  async signup(ctx: PublicContext, input: SignupInput): Promise<AuthenticatedResult> {
    const emailNormalized = normalizeEmail(input.email);
    if (await userRepository.findByEmailNormalized(emailNormalized)) {
      throw new AppError("EMAIL_ALREADY_EXISTS");
    }
    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      emailNormalized,
      passwordHash: await hashPassword(input.password),
    });
    const session = await createSession(user._id.toString());
    logger.info("User signed up", { requestId: ctx.requestId, userId: user._id.toString() });
    return { body: toAuthResultDto(user, false), session };
  },

  /**
   * API §12. Unknown email and wrong password fail identically, in wording and
   * in timing (verifyPasswordOrBurn hashes against a dummy when there is no account).
   */
  async login(ctx: PublicContext, input: LoginInput): Promise<AuthenticatedResult> {
    const user = await userRepository.findByEmailNormalizedWithPassword(
      normalizeEmail(input.email),
    );
    const valid = await verifyPasswordOrBurn(user?.passwordHash, input.password);
    if (!user || !valid) throw new AppError("UNAUTHENTICATED", INVALID_CREDENTIALS);

    const userId = user._id.toString();
    const [session, context] = await Promise.all([
      createSession(userId),
      findWeddingContext(userId),
    ]);
    return { body: toAuthResultDto(user, context !== null), session };
  },

  /** API §13. Destroys only the current session; the handler clears the cookie. */
  async logout(ctx: UserContext, rawSessionToken: string | null): Promise<void> {
    await destroySession(rawSessionToken);
  },

  /** API §14. Current user + membership + wedding summary (nulls before a wedding exists). */
  async me(ctx: UserContext): Promise<MeDto> {
    const [user, context] = await Promise.all([
      userRepository.findById(ctx.userId),
      findWeddingContext(ctx.userId),
    ]);
    if (!user) throw new AppError("UNAUTHENTICATED");
    return toMeDto(user, context);
  },

  /**
   * API §15. Always succeeds outwardly. For an existing account it stores the
   * HMAC of a fresh single-use token and emails the raw link after the
   * response is sent, so neither the answer nor its timing reveals the account.
   */
  async forgotPassword(ctx: PublicContext, input: ForgotPasswordInput): Promise<void> {
    const user = await userRepository.findByEmailNormalized(normalizeEmail(input.email));
    if (!user) return;

    const token = generateToken();
    await passwordResetTokenRepository.create({
      userId: user._id.toString(),
      tokenHash: hashToken("password-reset", token),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * MS_PER_MINUTE),
    });

    const resetUrl = new URL(`/reset-password/${token}`, getEnv().NEXT_PUBLIC_APP_URL).toString();
    runAfterResponse("password-reset-email", () =>
      getEmailService().send({
        to: user.email,
        template: "password-reset",
        props: {
          recipientName: user.name,
          resetUrl,
          expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
        },
      }),
    );
  },

  /**
   * API §16. INVALID_TOKEN for malformed, unknown or used links; TOKEN_EXPIRED
   * once the link is past its expiry. A successful reset signs the user out
   * everywhere (SYSTEM_DESIGN §12), so they sign in again with the new password.
   */
  async resetPassword(ctx: PublicContext, input: ResetPasswordInput): Promise<void> {
    if (!isWellFormedToken(input.token)) throw new AppError("INVALID_TOKEN");

    const record = await passwordResetTokenRepository.findByTokenHash(
      hashToken("password-reset", input.token),
    );
    if (!record || record.usedAt) throw new AppError("INVALID_TOKEN");
    const now = new Date();
    if (record.expiresAt.getTime() <= now.getTime()) throw new AppError("TOKEN_EXPIRED");

    // Hash first (slow), then claim the token atomically so a link works exactly once.
    const passwordHash = await hashPassword(input.password);
    if (!(await passwordResetTokenRepository.markUsed(record._id.toString(), now))) {
      throw new AppError("INVALID_TOKEN");
    }

    const userId = record.userId.toString();
    await userRepository.updatePasswordHash(userId, passwordHash);
    await destroyAllSessionsForUser(userId);
    logger.info("Password reset", { requestId: ctx.requestId, userId });
  },
};
