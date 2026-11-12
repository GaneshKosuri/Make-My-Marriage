import "server-only";

import type { EventSummaryDto } from "@/modules/events/event.types";

import type { GuestRecord } from "./guest.model";
import type { GuestDto } from "./guest.types";

/**
 * Guest document → DTO (API_DESIGN §39 notes). Built field by field, so the
 * invitation token and `emailNormalized` can never leak into a response.
 * Invited events keep their stored order; one that no longer exists is left out.
 *
 * TODO(Phase 3: Guests, slice 3): toPublicInvitationDto (API_DESIGN §50 fields only).
 */
export function toGuestDto(
  guest: GuestRecord,
  events: ReadonlyMap<string, EventSummaryDto>,
): GuestDto {
  return {
    id: guest._id.toString(),
    name: guest.name,
    email: guest.email ?? null,
    phone: guest.phone ?? null,
    maxGuests: guest.maxGuests,
    invitedEvents: guest.invitedEventIds.flatMap((id) => {
      const event = events.get(id.toString());
      return event ? [event] : [];
    }),
    notes: guest.notes ?? null,
    rsvpStatus: guest.rsvpStatus,
    attendingCount: guest.attendingCount ?? null,
    rsvpUpdatedAt: guest.rsvpUpdatedAt?.toISOString() ?? null,
    invitationSentAt: guest.invitationSentAt?.toISOString() ?? null,
    lastReminderSentAt: guest.lastReminderSentAt?.toISOString() ?? null,
    reminderCount: guest.reminderCount,
    version: guest.__v,
    createdAt: guest.createdAt.toISOString(),
    updatedAt: guest.updatedAt.toISOString(),
  };
}
