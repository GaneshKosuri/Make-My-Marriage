import { randomUUID } from "node:crypto";

import type { Metadata } from "next";
import { headers } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";

import { InvitationScreen } from "@/features/invitation/components/invitation-screen";
import { InvitationMessage } from "@/features/invitation/components/invitation-message";
import { invitationService } from "@/modules/guests";
import type { PublicInvitationDto } from "@/modules/guests/guest.types";
import { isAppError } from "@/server/errors";
import { getClientIp, policies } from "@/server/http";
import { logger } from "@/server/logging/logger";
import { getRateLimiter } from "@/server/security/rate-limit";

// The token is a secret: never indexed, never leaked via Referer (the layout and next.config.ts too).
export const metadata: Metadata = {
  title: "Your invitation",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/**
 * /invite/[token] — a guest's personal invitation and RSVP (PRD §9.9–9.11,
 * API_DESIGN §50–51). Read here from the service; the RSVP itself goes through
 * POST /api/public/invitations/:token/rsvp. Request-time data inside <Suspense>.
 */
export default function InvitationPage({ params }: PageProps<"/invite/[token]">) {
  return (
    <Suspense fallback={<div className="min-h-[60dvh]" aria-busy="true" />}>
      <Invitation params={params} />
    </Suspense>
  );
}

async function Invitation({ params }: Pick<PageProps<"/invite/[token]">, "params">) {
  const { token } = await params;
  await connection();
  const state = await findInvitation(token);
  if (state.status === "ok") return <InvitationScreen token={token} initial={state.invitation} />;
  return <InvitationMessage kind={state.status} />;
}

type InvitationState =
  | { status: "ok"; invitation: PublicInvitationDto }
  | { status: "not-found" }
  | { status: "unavailable" };

/**
 * Same rules and rate limit as GET /api/public/invitations/:token (API §50):
 * unusable links are not found, and too many lookups from one address are refused.
 */
async function findInvitation(token: string): Promise<InvitationState> {
  try {
    await getRateLimiter().enforce([
      {
        policy: policies.publicInvitationView,
        subject: getClientIp({ headers: await headers() }),
      },
    ]);
    const invitation = await invitationService.getPublicInvitation(
      { requestId: randomUUID() },
      token,
    );
    return { status: "ok", invitation };
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") return { status: "not-found" };
    if (!(isAppError(error) && error.code === "RATE_LIMITED")) {
      logger.warn("Could not load a guest invitation", { error });
    }
    return { status: "unavailable" };
  }
}
