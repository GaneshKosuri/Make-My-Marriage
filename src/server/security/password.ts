import "server-only";

import { hash, verify } from "@node-rs/argon2";

/**
 * Password hashing with argon2id (the @node-rs/argon2 default algorithm).
 * Parameters follow the OWASP Password Storage Cheat Sheet minimum for
 * argon2id: m = 19 MiB, t = 2, p = 1. Never implement crypto by hand (SYSTEM_DESIGN §9).
 *
 * Length rules for user input live in the auth module's Zod schemas; the byte
 * cap here is a last-line defence against hashing huge inputs.
 */

const ARGON2_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

export const MAX_PASSWORD_BYTES = 1024;

function assertReasonableLength(plain: string): void {
  if (Buffer.byteLength(plain, "utf8") > MAX_PASSWORD_BYTES) {
    throw new RangeError("Password is too long");
  }
}

export async function hashPassword(plain: string): Promise<string> {
  assertReasonableLength(plain);
  return hash(plain, ARGON2_OPTIONS);
}

/** Returns false (never throws) for a wrong password or a malformed stored hash. */
export async function verifyPassword(passwordHash: string, plain: string): Promise<boolean> {
  if (Buffer.byteLength(plain, "utf8") > MAX_PASSWORD_BYTES) return false;
  try {
    return await verify(passwordHash, plain);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/**
 * Verifies against `passwordHash`, or burns equivalent work against a dummy
 * hash when the account does not exist, so login timing does not reveal
 * whether an email is registered (API_DESIGN §12).
 */
export async function verifyPasswordOrBurn(
  passwordHash: string | null | undefined,
  plain: string,
): Promise<boolean> {
  if (passwordHash) return verifyPassword(passwordHash, plain);
  dummyHash ??= hashPassword("mmm-dummy-password-for-timing-equalisation");
  await verifyPassword(await dummyHash, plain);
  return false;
}
