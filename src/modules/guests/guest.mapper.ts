import "server-only";

import { weddingPlace } from "@/lib/couple";
import type { EventSummaryDto, PublicEventDto } from "@/modules/events/event.types";

import type { GuestRecord } from "./guest.model";
import type { GuestDto, PublicInvitationDto } from "./guest.types";

/**
 * Guest document → DTO (API_DESIGN §39 notes). Built field by field, so the
 * invitation token and `emailNormalized` can never leak into a response.
 * Invited events are in date order, as on the guest's invitation, whatever
 * order they were ticked in (QA P3-2); one that no longer exists is left out.
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
    invitedEvents: guest.invitedEventIds
      .flatMap((id) => {
        const event = events.get(id.toString());
        return event ? [event] : [];
      })
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id)),
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

/** The wedding fields an invitation may show. */
export interface InvitationWedding {
  brideName: string;
  groomName: string;
  weddingDate: string;
  timeZone: string;
  title: string | null;
  city: string | null;
  state: string | null;
}

/**
 * What a guest's own link shows (API_DESIGN §50): their name, party size and
 * reply, the couple, and their active invited events. No ids, contacts, notes,
 * delivery dates or other guests.
 */
export function toPublicInvitationDto(
  guest: GuestRecord,
  wedding: InvitationWedding,
  events: PublicEventDto[],
): PublicInvitationDto {
  return {
    guest: {
      name: guest.name,
      maxGuests: guest.maxGuests,
      rsvpStatus: guest.rsvpStatus,
      attendingCount: guest.attendingCount ?? null,
    },
    wedding: {
      brideName: wedding.brideName,
      groomName: wedding.groomName,
      weddingDate: wedding.weddingDate,
      timeZone: wedding.timeZone,
      title: wedding.title,
      location: weddingPlace(wedding),
    },
    events,
  };
}
