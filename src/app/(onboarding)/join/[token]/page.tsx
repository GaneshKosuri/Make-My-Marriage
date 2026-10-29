import { randomUUID } from "node:crypto";

import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { JoinScreen, type JoinInvitationState } from "@/features/members/components/join-screen";
import { memberInvitationService } from "@/modules/members";
import { isAppError } from "@/server/errors";
import { logger } from "@/server/logging/logger";

import { readSessionSafely } from "../../../read-session-safely";

// The token is a secret: never indexed, never leaked via Referer (next.config.ts headers too).
export const metadata: Metadata = {
  title: "Join a wedding",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/**
 * /join/[token] — Wedding Member invitation acceptance (binding decision 12;
 * API_DESIGN §25–26). The invitation and the session are request-time data,
 * read inside <Suspense> (Cache Components).
 */
export default function JoinWeddingPage({ params }: PageProps<"/join/[token]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-ivory" aria-busy="true" />}>
      <Join params={params} />
    </Suspense>
  );
}

async function Join({ params }: Pick<PageProps<"/join/[token]">, "params">) {
  const { token } = await params;
  await connection();
  const [state, current] = await Promise.all([findInvitation(token), readSessionSafely("join")]);
  const viewer = current
    ? {
        name: current.user.name,
        email: current.user.email,
        hasWedding: current.membership !== null,
      }
    : null;
  return <JoinScreen token={token} state={state} viewer={viewer} />;
}

/** Same rules as GET /api/public/member-invitations/:token (API §25): unusable links are not found. */
async function findInvitation(token: string): Promise<JoinInvitationState> {
  try {
    const invitation = await memberInvitationService.getPublicInvitation(
      { requestId: randomUUID() },
      token,
    );
    return { status: "ok", invitation };
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") return { status: "not-found" };
    logger.warn("Could not load a member invitation", { error });
    return { status: "unavailable" };
  }
}
