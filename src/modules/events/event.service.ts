import "server-only";

import type { MemberContext } from "@/server/auth";
import { notImplemented } from "@/server/errors";

import type { CoverUploadRequestInput, CoverUploadUrlDto } from "@/modules/weddings/wedding.types";

import { toEventDto, toEventSummaryDto } from "./event.mapper";
import { eventRepository } from "./event.repository";
import type {
  CreateEventInput,
  EventDto,
  EventSummaryDto,
  ListEventsQuery,
  UpdateEventInput,
} from "./event.types";

/** Wedding events (PRD §9.5; SYSTEM_DESIGN §29; API_DESIGN §29–33, §83). Phase 2. */
export const eventsService = {
  /** startsAt ASC; archived excluded unless requested. API §29. */
  async list(ctx: MemberContext, query: ListEventsQuery): Promise<EventDto[]> {
    return notImplemented("API_DESIGN §29 (Phase 2: Planning)");
  },

  /** API §30. */
  async create(ctx: MemberContext, input: CreateEventInput): Promise<EventDto> {
    return notImplemented("API_DESIGN §30 (Phase 2: Planning)");
  },

  /** `_id + weddingId`; cross-wedding → NOT_FOUND. API §31. */
  async get(ctx: MemberContext, eventId: string): Promise<EventDto> {
    return notImplemented("API_DESIGN §31 (Phase 2: Planning)");
  },

  /** Partial; start/end validated after merge; archived read-only; `__v` mismatch → CONFLICT. API §32. */
  async update(ctx: MemberContext, eventId: string, input: UpdateEventInput): Promise<EventDto> {
    return notImplemented("API_DESIGN §32 (Phase 2: Planning)");
  },

  /** Sets archivedAt; never hard-deletes. API §33. */
  async archive(ctx: MemberContext, eventId: string): Promise<void> {
    return notImplemented("API_DESIGN §33 (Phase 2: Planning)");
  },

  /** API §83. */
  async requestCoverUploadUrl(
    ctx: MemberContext,
    eventId: string,
    input: CoverUploadRequestInput,
  ): Promise<CoverUploadUrlDto> {
    return notImplemented("API_DESIGN §83 (Phase 5: Wedding Experience)");
  },

  // ── Cross-module operations (call through @/modules/events) ─────────────

  /**
   * Throws VALIDATION_ERROR unless every id is an active event of this wedding.
   * Used by tasks, guests, vendors, expenses and photos (DATABASE_DESIGN §83).
   */
  async assertActiveEventsInWedding(weddingId: string, eventIds: readonly string[]): Promise<void> {
    return notImplemented("DATABASE_DESIGN §83 (Phase 2: Planning)");
  },

  /** Summaries for embedding in other DTOs, including archived events. */
  async findSummaries(
    weddingId: string,
    eventIds: readonly string[],
  ): Promise<Map<string, EventSummaryDto>> {
    const events = await eventRepository.findByIds(weddingId, [...new Set(eventIds)]);
    return new Map(events.map((event) => [event._id.toString(), toEventSummaryDto(event)]));
  },

  /** Dashboard: events that are not archived (DATABASE_DESIGN §88). */
  async countActive(weddingId: string): Promise<number> {
    return eventRepository.countActive(weddingId);
  },

  /**
   * Dashboard "Upcoming Events" (PRD §9.3): the nearest events that have not
   * finished yet, with venue and dress code for the card.
   */
  async listUpcoming(weddingId: string, limit: number, now = new Date()): Promise<EventDto[]> {
    const events = await eventRepository.listUpcoming(weddingId, now, limit);
    return events.map(toEventDto);
  },
};
