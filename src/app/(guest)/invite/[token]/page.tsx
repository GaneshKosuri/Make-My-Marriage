import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Your invitation" };

/**
 * /invite/[token] — a guest's personal invitation and RSVP (PRD §9.9–9.11).
 * Phase 3 reads it via invitationService.getPublicInvitation (a read from a Server
 * Component is allowed; the RSVP itself goes through POST /api/public/invitations/:token/rsvp).
 */
export default function InvitationPage() {
  return (
    <PagePlaceholder
      title="You're invited"
      phase="Phase 3: Guests"
      description="Your invited events, venues and RSVP — no account needed."
    />
  );
}
