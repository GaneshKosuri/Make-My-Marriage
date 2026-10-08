import "server-only";

import type { MembershipRole } from "./types";

/**
 * Identity ports.
 *
 * Session handling and request authentication are infrastructure, but the data
 * they need (sessions, users, memberships, weddings) is owned by domain
 * modules — and src/server must never import src/modules (dependency rule 3).
 * So src/server defines these interfaces, modules/auth implements them, and
 * src/composition-root.ts wires the two together at startup
 * (src/instrumentation.ts in Next.js; tests/setup/* in Vitest).
 *
 * The registry lives on globalThis so every server bundle in the process sees
 * the same ports.
 */

export interface SessionRecord {
  sessionId: string;
  userId: string;
  expiresAt: Date;
  lastUsedAt: Date | null;
}

export interface SessionStore {
  create(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<SessionRecord>;
  findByTokenHash(tokenHash: string): Promise<SessionRecord | null>;
  touch(sessionId: string, at: Date): Promise<void>;
  deleteByTokenHash(tokenHash: string): Promise<void>;
  deleteAllForUser(userId: string): Promise<number>;
}

export interface IdentityUser {
  id: string;
  name: string;
  email: string;
}

export interface IdentityMembership {
  membershipId: string;
  weddingId: string;
  role: MembershipRole;
}

/** The couple identity shown on every signed-in page (PRD §12.1). */
export interface IdentityWedding {
  id: string;
  brideName: string;
  groomName: string;
  title: string | null;
  weddingDate: string;
  timeZone: string;
}

export interface IdentityDirectory {
  findUserById(userId: string): Promise<IdentityUser | null>;
  /** The user's membership, or null when they have none or the wedding is soft-deleted. */
  findMembershipByUserId(userId: string): Promise<IdentityMembership | null>;
  /** Null when missing or soft-deleted. */
  findWeddingById(weddingId: string): Promise<IdentityWedding | null>;
}

export interface IdentityPorts {
  sessions: SessionStore;
  directory: IdentityDirectory;
}

const registry = globalThis as typeof globalThis & { __mmmIdentityPorts?: IdentityPorts };

export function configureIdentity(ports: IdentityPorts): void {
  registry.__mmmIdentityPorts = ports;
}

export function getIdentity(): IdentityPorts {
  const ports = registry.__mmmIdentityPorts;
  if (!ports) {
    throw new Error(
      "Identity ports are not configured. registerServerDependencies() from src/composition-root.ts " +
        "must run at startup (src/instrumentation.ts in Next.js, tests/setup/* in Vitest).",
    );
  }
  return ports;
}

/** Tests only. */
export function resetIdentityForTests(): void {
  delete registry.__mmmIdentityPorts;
}
