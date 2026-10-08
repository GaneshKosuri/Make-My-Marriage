import "server-only";

import { getEnv } from "@/server/config/env";
import { logger } from "@/server/logging/logger";
import { generateToken, hashToken, isWellFormedToken } from "@/server/security/tokens";

import { getIdentity, type SessionRecord } from "./identity";

/**
 * Server-side sessions (SYSTEM_DESIGN §10–11, DATABASE_DESIGN §9–11).
 *
 * create:  random token → HMAC("session") → `sessions` document; the raw
 *          token goes only into the cookie.
 * resolve: look up by hash, reject expired, refresh `lastUsedAt` at most once
 *          per SESSION_TOUCH_INTERVAL_MS (throttled to avoid a write per request).
 * Sessions have a fixed lifetime (SESSION_TTL_DAYS); MongoDB's TTL index
 * removes them after expiry.
 */

const MS_PER_DAY = 86_400_000;
export const SESSION_TOUCH_INTERVAL_MS = 5 * 60_000;

export interface CreatedSession {
  /** Raw token for the cookie. Never log or persist it. */
  token: string;
  sessionId: string;
  expiresAt: Date;
}

export async function createSession(
  userId: string,
  now: Date = new Date(),
): Promise<CreatedSession> {
  const token = generateToken();
  const expiresAt = new Date(now.getTime() + getEnv().SESSION_TTL_DAYS * MS_PER_DAY);
  const session = await getIdentity().sessions.create({
    userId,
    tokenHash: hashToken("session", token),
    expiresAt,
  });
  return { token, sessionId: session.sessionId, expiresAt };
}

export async function resolveSession(
  rawToken: string | null | undefined,
  now: Date = new Date(),
): Promise<SessionRecord | null> {
  if (!isWellFormedToken(rawToken)) return null;

  const { sessions } = getIdentity();
  const session = await sessions.findByTokenHash(hashToken("session", rawToken));
  if (!session || session.expiresAt.getTime() <= now.getTime()) return null;

  const lastUsed = session.lastUsedAt?.getTime() ?? 0;
  if (now.getTime() - lastUsed >= SESSION_TOUCH_INTERVAL_MS) {
    try {
      await sessions.touch(session.sessionId, now);
    } catch (error) {
      // Bookkeeping only: never fail authentication because of it.
      logger.warn("Failed to refresh session lastUsedAt", { error });
    }
  }
  return session;
}

/** Logout: deletes the session behind this token (no-op for unknown tokens). */
export async function destroySession(rawToken: string | null | undefined): Promise<void> {
  if (!isWellFormedToken(rawToken)) return;
  await getIdentity().sessions.deleteByTokenHash(hashToken("session", rawToken));
}

/** e.g. after a password reset (SYSTEM_DESIGN §12). Returns the number removed. */
export async function destroyAllSessionsForUser(userId: string): Promise<number> {
  return getIdentity().sessions.deleteAllForUser(userId);
}
