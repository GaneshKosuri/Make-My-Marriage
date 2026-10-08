import "server-only";

import type { PageResult } from "@/lib/pagination";
import type { MemberContext } from "@/server/auth";
import { notImplemented } from "@/server/errors";

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

/** Guest list management for organisers (PRD §9.7–9.13; API_DESIGN §39–49, §52). Phase 3. */
export const guestsService = {
  /** API §39. */
  async list(ctx: MemberContext, query: ListGuestsQuery): Promise<PageResult<GuestDto>> {
    return notImplemented("API_DESIGN §39 (Phase 3: Guests)");
  },

  /** Validates events; generates the stable invitation token. API §40. */
  async create(ctx: MemberContext, input: CreateGuestInput): Promise<GuestDto> {
    return notImplemented("API_DESIGN §40 (Phase 3: Guests)");
  },

  /** API §41. */
  async get(ctx: MemberContext, guestId: string): Promise<GuestDto> {
    return notImplemented("API_DESIGN §41 (Phase 3: Guests)");
  },

  /** Rejects capacity below recorded attendance; `__v` mismatch → CONFLICT. API §42. */
  async update(ctx: MemberContext, guestId: string, input: UpdateGuestInput): Promise<GuestDto> {
    return notImplemented("API_DESIGN §42 (Phase 3: Guests)");
  },

  /** Hard delete + cancel pending EmailJobs (emailJobsService). API §43. */
  async delete(ctx: MemberContext, guestId: string): Promise<void> {
    return notImplemented("API_DESIGN §43, DATABASE_DESIGN §48 (Phase 3: Guests)");
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

  /** Invitations vs people attending, from saved data. API §52. */
  async getRsvpSummary(ctx: MemberContext): Promise<RsvpSummaryDto> {
    return notImplemented("API_DESIGN §52 (Phase 3: Guests)");
  },

  // ── Cross-module operations ─────────────────────────────────────────────

  /** Dashboard guest and RSVP counts. */
  async countForDashboard(weddingId: string): Promise<{
    guests: number;
    rsvps: { pending: number; attending: number; notAttending: number };
  }> {
    return notImplemented("API_DESIGN §20 (Phase 1: Foundation — dashboard)");
  },
};
