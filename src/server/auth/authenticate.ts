import "server-only";

import type { NextRequest } from "next/server";

import { getEnv } from "@/server/config/env";
import { AppError } from "@/server/errors";
import { safeEqual } from "@/server/security/tokens";

import { readSessionToken } from "./cookies";
import { getIdentity } from "./identity";
import { resolveSession } from "./session";
import type { AuthLevel, ContextFor, MemberContext, UserContext } from "./types";

/**
 * Resolves the request context for an auth level (used by `route()`).
 *
 * | level    | requirement                                                        |
 * | -------- | ------------------------------------------------------------------ |
 * | public   | nothing                                                            |
 * | user     | valid session (membership optional)                                |
 * | member   | valid session + membership in a non-deleted wedding                |
 * | admin    | member with role ADMIN (API_DESIGN §97)                            |
 * | internal | `Authorization: Bearer <CRON_SECRET>`, constant-time compare       |
 */
export async function authenticate<A extends AuthLevel>(
  level: A,
  request: NextRequest,
  requestId: string,
): Promise<ContextFor<A>> {
  switch (level) {
    case "public":
      return { requestId } as ContextFor<A>;
    case "internal":
      assertCronSecret(request);
      return { requestId } as ContextFor<A>;
    case "user":
      return (await resolveUser(request, requestId)) as ContextFor<A>;
    case "member":
      return (await resolveMember(request, requestId)) as ContextFor<A>;
    case "admin": {
      const member = await resolveMember(request, requestId);
      if (member.role !== "ADMIN") {
        throw new AppError("FORBIDDEN", "Only Admins can manage Wedding Members.");
      }
      return member as ContextFor<A>;
    }
    default:
      throw new Error(`Unknown auth level: ${String(level)}`);
  }
}

function assertCronSecret(request: NextRequest): void {
  const { CRON_SECRET } = getEnv();
  const match = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "");
  // Fail closed when no secret is configured.
  if (!CRON_SECRET || !match?.[1] || !safeEqual(match[1], CRON_SECRET)) {
    throw new AppError("UNAUTHENTICATED");
  }
}

async function resolveUser(request: NextRequest, requestId: string): Promise<UserContext> {
  const token = readSessionToken(request);
  if (!token) throw new AppError("UNAUTHENTICATED");

  const session = await resolveSession(token);
  if (!session) throw new AppError("UNAUTHENTICATED");

  return { requestId, userId: session.userId, sessionId: session.sessionId };
}

async function resolveMember(request: NextRequest, requestId: string): Promise<MemberContext> {
  const user = await resolveUser(request, requestId);
  const membership = await getIdentity().directory.findMembershipByUserId(user.userId);
  if (!membership) {
    // Signed in, but not part of a (non-deleted) wedding.
    throw new AppError("FORBIDDEN", "Create or join a wedding to continue.");
  }
  return {
    requestId,
    userId: user.userId,
    membershipId: membership.membershipId,
    weddingId: membership.weddingId,
    role: membership.role,
  };
}
