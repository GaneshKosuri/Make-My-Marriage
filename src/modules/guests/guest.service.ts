import "server-only";

import type { PageResult } from "@/lib/pagination";
import type { MemberContext } from "@/server/auth";
import { AppError, notImplemented } from "@/server/errors";
import { buildPagePagination } from "@/server/http/pagination";
import { logger } from "@/server/logging/logger";
import { generateToken } from "@/server/security/tokens";

import { emailJobsService } from "@/modules/email-jobs";
import { eventsService } from "@/modules/events";

import { toGuestDto } from "./guest.mapper";
import type { GuestRecord } from "./guest.model";
import { guestRepository, type GuestFields } from "./guest.repository";
import type {
  BulkEmailInput,
  BulkEmailResultDto,
  CreateGuestInput,
  GuestDto,
  InvitationLinkDto,
  ListGuestsQuery,
  RsvpSummaryDto,
  UpdateGuestInput,
} from "./guest.types";

/** Field key the form shows event problems against. */
const EVENTS_FIELD = "invitedEventIds";

/** Blank optional text is stored as null ("not set"). */
const orNull = (value: string | null | undefined) => value || null;

/** The party size can't drop below the people already coming (API_DESIGN §42). */
function capacityError(attendingCount: number): AppError {
  const people = attendingCount === 1 ? "1 person is" : `${attendingCount} people are`;
  return new AppError("VALIDATION_ERROR", undefined, {
    details: { maxGuests: `They said ${people} coming. Allow at least ${attendingCount}.` },
  });
}

/** Guest list management for organisers (PRD §9.7–9.13; API_DESIGN §39–49, §52). Phase 3. */
export const guestsService = {
  /** Name order; filters combine with AND (API_DESIGN §39). */
  async list(ctx: MemberContext, query: ListGuestsQuery): Promise<PageResult<GuestDto>> {
    const page = { page: query.page, limit: query.limit };
    const { items, total } = await guestRepository.list(
      ctx.weddingId,
      {
        search: query.search,
        rsvpStatus: query.rsvpStatus,
        eventId: query.eventId,
        invitationSent: query.invitationSent,
      },
      page,
    );
    return {
      items: await toGuestDtos(ctx.weddingId, items),
      pagination: buildPagePagination(total, page),
    };
  },

  /**
   * Invited events must be active events of this wedding. Generates the stable
   * invitation token, which the response never contains. API §40.
   */
  async create(ctx: MemberContext, input: CreateGuestInput): Promise<GuestDto> {
    if (input.invitedEventIds.length > 0) {
      await eventsService.assertActiveEventsInWedding(
        ctx.weddingId,
        input.invitedEventIds,
        EVENTS_FIELD,
      );
    }
    const guest = await guestRepository.create(ctx.weddingId, {
      name: input.name,
      email: orNull(input.email),
      phone: orNull(input.phone),
      maxGuests: input.maxGuests,
      invitedEventIds: input.invitedEventIds,
      notes: orNull(input.notes),
      invitationToken: generateToken(),
    });
    logger.info("Guest created", {
      requestId: ctx.requestId,
      weddingId: ctx.weddingId,
      guestId: guest._id.toString(),
    });
    return toSingleDto(ctx.weddingId, guest);
  },

  /** `_id + weddingId`; cross-wedding → NOT_FOUND. API §41. */
  async get(ctx: MemberContext, guestId: string): Promise<GuestDto> {
    const guest = await guestRepository.findById(ctx.weddingId, guestId);
    if (!guest) throw new AppError("NOT_FOUND");
    return toSingleDto(ctx.weddingId, guest);
  },

  /**
   * Partial. Events the guest gains must be active; events it already has may
   * stay even if archived. The party size can't drop below the recorded
   * attendance (checked again atomically). A stale `version`, or another write
   * between our read and update, is CONFLICT. RSVP and delivery fields and the
   * token are never touched. API §42.
   */
  async update(ctx: MemberContext, guestId: string, input: UpdateGuestInput): Promise<GuestDto> {
    const current = await guestRepository.findById(ctx.weddingId, guestId);
    if (!current) throw new AppError("NOT_FOUND");
    if (input.version !== undefined && input.version !== current.__v) {
      throw new AppError("CONFLICT");
    }
    if (input.invitedEventIds !== undefined) {
      const existing = new Set(current.invitedEventIds.map((id) => id.toString()));
      const added = input.invitedEventIds.filter((id) => !existing.has(id));
      if (added.length > 0) {
        await eventsService.assertActiveEventsInWedding(ctx.weddingId, added, EVENTS_FIELD);
      }
    }
    if (
      input.maxGuests !== undefined &&
      current.attendingCount !== null &&
      input.maxGuests < current.attendingCount
    ) {
      throw capacityError(current.attendingCount);
    }

    const changes: Partial<GuestFields> = {};
    if (input.name !== undefined) changes.name = input.name;
    if (input.email !== undefined) changes.email = orNull(input.email);
    if (input.phone !== undefined) changes.phone = orNull(input.phone);
    if (input.maxGuests !== undefined) changes.maxGuests = input.maxGuests;
    if (input.invitedEventIds !== undefined) changes.invitedEventIds = input.invitedEventIds;
    if (input.notes !== undefined) changes.notes = orNull(input.notes);

    const updated = await guestRepository.updateVersioned(
      ctx.weddingId,
      guestId,
      current.__v,
      changes,
    );
    if (!updated) {
      // Gone, or someone (an organiser or the guest's RSVP) saved first.
      const stillThere = await guestRepository.findById(ctx.weddingId, guestId);
      throw new AppError(stillThere ? "CONFLICT" : "NOT_FOUND");
    }
    logger.info("Guest updated", {
      requestId: ctx.requestId,
      weddingId: ctx.weddingId,
      guestId,
      fields: Object.keys(changes),
    });
    return toSingleDto(ctx.weddingId, updated);
  },

  /**
   * Hard delete: the invitation link stops working at once, and emails still
   * waiting to be sent to this guest are cancelled (DATABASE_DESIGN §48). API §43.
   */
  async delete(ctx: MemberContext, guestId: string): Promise<void> {
    if (!(await guestRepository.delete(ctx.weddingId, guestId))) throw new AppError("NOT_FOUND");
    const cancelledEmails = await emailJobsService.cancelPendingForGuest(ctx.weddingId, guestId);
    logger.info("Guest deleted", {
      requestId: ctx.requestId,
      weddingId: ctx.weddingId,
      guestId,
      cancelledEmails,
    });
  },

  /** Stable URL from NEXT_PUBLIC_APP_URL + stored token (never the Host header). API §45. */
  async getInvitationLink(ctx: MemberContext, guestId: string): Promise<InvitationLinkDto> {
    return notImplemented("API_DESIGN §45 (Phase 3: Guests)");
  },

  /** Requires email; sends immediately; sets invitationSentAt. API §46. */
  async sendInvitation(ctx: MemberContext, guestId: string): Promise<void> {
    return notImplemented("API_DESIGN §46 (Phase 3: Guests)");
  },

  /** Requires email + PENDING; bumps lastReminderSentAt / reminderCount. API §48. */
  async sendReminder(ctx: MemberContext, guestId: string): Promise<void> {
    return notImplemented("API_DESIGN §48 (Phase 3: Guests)");
  },

  /** Creates EmailJobs (one per guest) and returns immediately. API §47. */
  async sendBulkInvitations(
    ctx: MemberContext,
    input: BulkEmailInput,
  ): Promise<BulkEmailResultDto> {
    return notImplemented("API_DESIGN §47 (Phase 3: Guests)");
  },

  /** API §49. */
  async sendBulkReminders(ctx: MemberContext, input: BulkEmailInput): Promise<BulkEmailResultDto> {
    return notImplemented("API_DESIGN §49 (Phase 3: Guests)");
  },

  /** Invitations (guest records) by RSVP status, and the people coming. API §52. */
  async getRsvpSummary(ctx: MemberContext): Promise<RsvpSummaryDto> {
    const summary = await guestRepository.rsvpSummary(ctx.weddingId);
    return {
      totalGuests: summary.totalGuests,
      pendingInvitations: summary.byStatus.PENDING,
      attendingInvitations: summary.byStatus.ATTENDING,
      notAttendingInvitations: summary.byStatus.NOT_ATTENDING,
      totalPeopleAttending: summary.totalPeopleAttending,
    };
  },

  // ── Cross-module operations ─────────────────────────────────────────────

  /** Dashboard guest and RSVP counts (API_DESIGN §20; SYSTEM_DESIGN §23 "people attending"). */
  async countForDashboard(weddingId: string): Promise<{
    guests: number;
    rsvps: { pending: number; attending: number; notAttending: number; peopleAttending: number };
    invitationsSent: number;
  }> {
    const summary = await guestRepository.rsvpSummary(weddingId);
    return {
      guests: summary.totalGuests,
      rsvps: {
        pending: summary.byStatus.PENDING,
        attending: summary.byStatus.ATTENDING,
        notAttending: summary.byStatus.NOT_ATTENDING,
        peopleAttending: summary.totalPeopleAttending,
      },
      invitationsSent: summary.invitationsSent,
    };
  },
};

/** Resolves invited-event summaries (archived ones included) in one batched lookup. */
async function toGuestDtos(weddingId: string, guests: readonly GuestRecord[]): Promise<GuestDto[]> {
  if (guests.length === 0) return [];
  const eventIds = guests.flatMap((guest) => guest.invitedEventIds.map((id) => id.toString()));
  const events =
    eventIds.length > 0 ? await eventsService.findSummaries(weddingId, eventIds) : new Map();
  return guests.map((guest) => toGuestDto(guest, events));
}

async function toSingleDto(weddingId: string, guest: GuestRecord): Promise<GuestDto> {
  const [dto] = await toGuestDtos(weddingId, [guest]);
  return dto!;
}
