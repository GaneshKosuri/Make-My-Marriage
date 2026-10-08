import "server-only";

import { connection } from "next/server";
import { cache } from "react";

import { readSessionTokenFromCookies } from "./cookies";
import {
  getIdentity,
  type IdentityMembership,
  type IdentityUser,
  type IdentityWedding,
} from "./identity";
import { resolveSession } from "./session";

export interface CurrentContext {
  user: IdentityUser;
  /** Null until the user creates or joins a wedding. */
  membership: IdentityMembership | null;
  wedding: IdentityWedding | null;
}

/**
 * The signed-in user, membership and wedding for layouts and Server
 * Components, or null when signed out. Memoised per request with React
 * `cache`. It reads cookies and waits for the request (`connection()`), so under Cache Components call it inside a
 * <Suspense> boundary.
 *
 * This is for rendering decisions only. Route handlers authorise through
 * `route({ auth })`, and every query is still scoped by weddingId.
 */
export const getCurrentContext = cache(async (): Promise<CurrentContext | null> => {
  // Session checks compare against the current time and hit the database, so
  // they must run for a real request, never inside a (runtime) prerender.
  await connection();
  const token = await readSessionTokenFromCookies();
  if (!token) return null;

  const session = await resolveSession(token);
  if (!session) return null;

  const { directory } = getIdentity();
  const user = await directory.findUserById(session.userId);
  if (!user) return null;

  const membership = await directory.findMembershipByUserId(user.id);
  const wedding = membership ? await directory.findWeddingById(membership.weddingId) : null;

  return {
    user,
    membership: wedding ? membership : null,
    wedding,
  };
});
