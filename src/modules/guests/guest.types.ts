/**
 * Guest DTOs and inputs (API_DESIGN §39–52). Isomorphic.
 */
import type { z } from "zod";

import type { BulkEmailScope, RsvpStatus } from "./guest.constants";
import type { createGuestSchema, listGuestsQuerySchema, updateGuestSchema } from "./guest.schemas";

/** Guest CRUD response. Never contains the invitation token or emailNormalized. */
export interface GuestDto {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  maxGuests: number;
  invitedEvents: { id: string; name: string; startsAt: string; archivedAt: string | null }[];
  notes: string | null;
  rsvpStatus: RsvpStatus;
  attendingCount: number | null;
  rsvpUpdatedAt: string | null;
  invitationSentAt: string | null;
  lastReminderSentAt: string | null;
  reminderCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type ListGuestsQuery = z.output<typeof listGuestsQuerySchema>;
export type CreateGuestInput = z.output<typeof createGuestSchema>;
export type UpdateGuestInput = z.output<typeof updateGuestSchema>;

/** GET /api/guests/:id/invitation-link (API_DESIGN §45). */
export interface InvitationLinkDto {
  url: string;
}

export interface BulkEmailInput {
  scope: BulkEmailScope;
  guestIds?: string[];
}

/** POST /api/guests/actions/* (API_DESIGN §47, §49). */
export interface BulkEmailResultDto {
  batchId: string;
  jobsCreated: number;
}

/** GET /api/guests/rsvp-summary (API_DESIGN §52): invitations vs people. */
export interface RsvpSummaryDto {
  totalGuests: number;
  pendingInvitations: number;
  attendingInvitations: number;
  notAttendingInvitations: number;
  totalPeopleAttending: number;
}

/** GET /api/public/invitations/:token (API_DESIGN §50). No ids, contacts or notes. */
export interface PublicInvitationDto {
  guest: {
    name: string;
    maxGuests: number;
    rsvpStatus: RsvpStatus;
    attendingCount: number | null;
  };
  wedding: {
    brideName: string;
    groomName: string;
    weddingDate: string;
    timeZone: string;
    title: string | null;
    location: string | null;
  };
  events: {
    name: string;
    startsAt: string;
    endsAt: string | null;
    venueName: string | null;
    address: string | null;
    dressCode: string | null;
    description: string | null;
  }[];
}

export interface SubmitRsvpInput {
  status: Exclude<RsvpStatus, "PENDING">;
  attendingCount: number;
}

/** POST /api/public/invitations/:token/rsvp (API_DESIGN §51). */
export interface RsvpResultDto {
  status: RsvpStatus;
  attendingCount: number;
  updatedAt: string;
}
