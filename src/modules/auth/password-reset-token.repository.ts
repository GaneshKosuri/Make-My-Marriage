import "server-only";

import { notImplemented } from "@/server/errors";

import type { PasswordResetTokenRecord } from "./password-reset-token.model";

/** Data access for `password_reset_tokens` (DATABASE_DESIGN §12). Keyed by user / token hash. */
export const passwordResetTokenRepository = {
  async create(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordResetTokenRecord> {
    return notImplemented("SYSTEM_DESIGN §12 (Phase 1: Foundation)");
  },

  async findByTokenHash(tokenHash: string): Promise<PasswordResetTokenRecord | null> {
    return notImplemented("API_DESIGN §16 (Phase 1: Foundation)");
  },

  /** Atomically marks an unused token as used; false if it was already used. */
  async markUsed(tokenId: string, usedAt: Date): Promise<boolean> {
    return notImplemented("API_DESIGN §16 (Phase 1: Foundation)");
  },
};
