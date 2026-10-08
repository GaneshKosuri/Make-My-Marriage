import "server-only";

import type { PageQuery } from "@/lib/pagination";
import { notImplemented } from "@/server/errors";

import type { RsvpStatus } from "./guest.constants";
import type { GuestDoc, GuestRecord } from "./guest.model";

export interface GuestListFilter {
  /** Literal, case-insensitive; regex metacharacters escaped (API_DESIGN §39 notes). */
  search?: string;
  rsvpStatus?: RsvpStatus;
  eventId?: string;
  invitationSent?: boolean;
}

/**
 * Data access for `guests`. `weddingId` is ALWAYS the first argument, except
 * public token resolution (a sanctioned tenant-guard opt-out).
 */
export const guestRepository = {
  /** Ordered by name, then `_id` (API_DESIGN §39 notes). */
  async list(
    weddingId: string,
    filter: GuestListFilter,
    page: PageQuery,
  ): Promise<{ items: GuestRecord[]; total: number }> {
    return notImplemented("API_DESIGN §39 (Phase 3: Guests)");
  },

  async findById(weddingId: string, guestId: string): Promise<GuestRecord | null> {
    return notImplemented("API_DESIGN §41 (Phase 3: Guests)");
  },

  /** Explicit `+invitationToken` projection for the sharing URL (API_DESIGN §45). */
  async findInvitationToken(weddingId: string, guestId: string): Promise<string | null> {
    return notImplemented("API_DESIGN §45 (Phase 3: Guests)");
  },

  async create(
    weddingId: string,
    input: Omit<GuestDoc, "weddingId" | "__v" | "createdAt" | "updatedAt">,
  ): Promise<GuestRecord> {
    return notImplemented("API_DESIGN §40 (Phase 3: Guests)");
  },

  /** Conditional on `__v` and on capacity ≥ recorded attendance. */
  async updateVersioned(
    weddingId: string,
    guestId: string,
    expectedVersion: number,
    changes: Partial<GuestDoc>,
  ): Promise<GuestRecord | null> {
    return notImplemented("API_DESIGN §42 (Phase 3: Guests)");
  },

  async delete(weddingId: string, guestId: string): Promise<boolean> {
    return notImplemented("API_DESIGN §43 (Phase 3: Guests)");
  },

  async rsvpSummary(weddingId: string): Promise<{
    totalGuests: number;
    byStatus: Record<RsvpStatus, number>;
    totalPeopleAttending: number;
  }> {
    return notImplemented("API_DESIGN §52 (Phase 3: Guests)");
  },

  /** Public token resolution: minimal owner projection (DATABASE_DESIGN §43). */
  async findByInvitationToken(token: string): Promise<GuestRecord | null> {
    return notImplemented("API_DESIGN §50 (Phase 3: Guests)");
  },

  /** Atomic RSVP write: guest id + wedding id + token + `__v` + capacity; increments `__v`. */
  async saveRsvp(
    weddingId: string,
    guestId: string,
    expectedVersion: number,
    rsvp: { rsvpStatus: RsvpStatus; attendingCount: number; rsvpUpdatedAt: Date },
  ): Promise<GuestRecord | null> {
    return notImplemented("API_DESIGN §51, DATABASE_DESIGN §43 (Phase 3: Guests)");
  },
};
