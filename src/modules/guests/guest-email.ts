import "server-only";

import { coupleDisplayName } from "@/lib/couple";
import { formatDateOnly } from "@/lib/dates";
import { getEnv } from "@/server/config/env";

import type { GuestEmailPort, QueuedGuestEmail } from "@/modules/email-jobs";
import { weddingsService } from "@/modules/weddings";

import { guestRepository } from "./guest.repository";

export type GuestEmailKind = "invitation" | "reminder";

/** /invite/:token on the configured app origin (never the request's Host header). */
export function invitationUrl(token: string): string {
  return new URL(`/invite/${token}`, getEnv().NEXT_PUBLIC_APP_URL).toString();
}

/**
 * The invitation or reminder for one guest as things stand now (PRD §9.12–9.13):
 * the guest by name, the couple by name (never the custom title), the wedding
 * date and the guest's own link. Null when it no longer applies: the guest or
 * wedding is gone, there's no email address, or (for a reminder) they replied
 * or were never emailed their invitation (decided 2026-11-12, review P6).
 */
export async function buildGuestEmail(
  weddingId: string,
  guestId: string,
  kind: GuestEmailKind,
): Promise<QueuedGuestEmail | null> {
  const [guest, wedding] = await Promise.all([
    guestRepository.findByIdWithToken(weddingId, guestId),
    weddingsService.findIdentityWedding(weddingId),
  ]);
  if (!guest?.email || !wedding) return null;
  if (kind === "reminder" && (guest.rsvpStatus !== "PENDING" || !guest.invitationSentAt)) {
    return null;
  }
  const props = {
    guestName: guest.name,
    coupleNames: coupleDisplayName({ brideName: wedding.brideName, groomName: wedding.groomName }),
    weddingDate: formatDateOnly(wedding.weddingDate),
    invitationUrl: invitationUrl(guest.invitationToken),
  };
  return kind === "invitation"
    ? { to: guest.email, template: "guest-invitation", props }
    : { to: guest.email, template: "rsvp-reminder", props };
}

const KIND_OF_JOB = { GUEST_INVITATION: "invitation", RSVP_REMINDER: "reminder" } as const;

/** What the email worker uses to build and record queued guest emails (composition root). */
export const guestEmailPort: GuestEmailPort = {
  compose: (job) =>
    buildGuestEmail(job.weddingId.toString(), job.guestId.toString(), KIND_OF_JOB[job.type]),
  delivered: (job, at) =>
    guestRepository.recordEmailed(
      job.weddingId.toString(),
      job.guestId.toString(),
      KIND_OF_JOB[job.type],
      at,
    ),
};
