import "server-only";

import type { MemberContext } from "@/server/auth";
import { AppError, notImplemented } from "@/server/errors";
import { logger } from "@/server/logging/logger";

import type { CoverUploadRequestInput, CoverUploadUrlDto } from "@/modules/weddings/wedding.types";

import { toEventDto, toEventSummaryDto, toPublicEventDto } from "./event.mapper";
import type { EventRecord } from "./event.model";
import { eventRepository, type EventFields } from "./event.repository";
import { END_BEFORE_START_MESSAGE, endsBeforeStart } from "./event.schemas";
import type {
  CreateEventInput,
  EventDto,
  EventSummaryDto,
  ListEventsQuery,
  PublicEventDto,
  UpdateEventInput,
} from "./event.types";

const ARCHIVED = "This event is archived, so it can't be changed.";

const toDate = (value: string | null | undefined) => (value ? new Date(value) : null);

/** Why a versioned update matched nothing: gone, archived, or changed by someone else. */
function updateRefused(event: EventRecord | null): AppError {
  if (!event) return new AppError("NOT_FOUND");
  if (event.archivedAt) return new AppError("CONFLICT", ARCHIVED);
  return new AppError("CONFLICT");
}

/** Wedding events (PRD §9.5; SYSTEM_DESIGN §29; API_DESIGN §29–33, §83). Phase 2. */
export const eventsService = {
  /** startsAt ASC; archived excluded unless requested. API §29. */
  async list(ctx: MemberContext, query: ListEventsQuery): Promise<EventDto[]> {
    const events = await eventRepository.list(ctx.weddingId, {
      includeArchived: query.includeArchived,
      from: toDate(query.from) ?? undefined,
      to: toDate(query.to) ?? undefined,
    });
    return events.map(toEventDto);
  },

  /** Blank optional text is stored as null. API §30. */
  async create(ctx: MemberContext, input: CreateEventInput): Promise<EventDto> {
    const event = await eventRepository.create(ctx.weddingId, {
      name: input.name,
      type: input.type ?? null,
      startsAt: new Date(input.startsAt),
      endsAt: toDate(input.endsAt),
      venueName: input.venueName || null,
      address: input.address || null,
      description: input.description || null,
      dressCode: input.dressCode || null,
    });
    logger.info("Event created", {
      requestId: ctx.requestId,
      weddingId: ctx.weddingId,
      eventId: event._id.toString(),
    });
    return toEventDto(event);
  },

  /** `_id + weddingId`, archived included; cross-wedding → NOT_FOUND. API §31. */
  async get(ctx: MemberContext, eventId: string): Promise<EventDto> {
    const event = await eventRepository.findById(ctx.weddingId, eventId);
    if (!event) throw new AppError("NOT_FOUND");
    return toEventDto(event);
  },

  /**
   * Partial; start/end validated after merging with the stored event; archived
   * events are read-only. A stale `version`, or another write between our read
   * and update, is CONFLICT. API §32.
   */
  async update(ctx: MemberContext, eventId: string, input: UpdateEventInput): Promise<EventDto> {
    const current = await eventRepository.findById(ctx.weddingId, eventId);
    if (!current || current.archivedAt) throw updateRefused(current);
    if (input.version !== undefined && input.version !== current.__v) {
      throw new AppError("CONFLICT");
    }

    const startsAt = input.startsAt ?? current.startsAt.toISOString();
    const endsAt = input.endsAt !== undefined ? input.endsAt : current.endsAt?.toISOString();
    if (endsBeforeStart(startsAt, endsAt)) {
      throw new AppError("VALIDATION_ERROR", undefined, {
        details: { endsAt: END_BEFORE_START_MESSAGE },
      });
    }

    const changes: Partial<EventFields> = {};
    if (input.name !== undefined) changes.name = input.name;
    if (input.type !== undefined) changes.type = input.type;
    if (input.startsAt !== undefined) changes.startsAt = new Date(input.startsAt);
    if (input.endsAt !== undefined) changes.endsAt = toDate(input.endsAt);
    if (input.venueName !== undefined) changes.venueName = input.venueName || null;
    if (input.address !== undefined) changes.address = input.address || null;
    if (input.description !== undefined) changes.description = input.description || null;
    if (input.dressCode !== undefined) changes.dressCode = input.dressCode || null;

    const updated = await eventRepository.updateVersioned(
      ctx.weddingId,
      eventId,
      current.__v,
      changes,
    );
    if (!updated) throw updateRefused(await eventRepository.findById(ctx.weddingId, eventId));

    logger.info("Event updated", {
      requestId: ctx.requestId,
      weddingId: ctx.weddingId,
      eventId,
      fields: Object.keys(changes),
    });
    return toEventDto(updated);
  },

  /**
   * Sets archivedAt; never hard-deletes (DATABASE_DESIGN §34). Archiving an
   * already archived event succeeds again. API §33.
   */
  async archive(ctx: MemberContext, eventId: string): Promise<void> {
    if (await eventRepository.archive(ctx.weddingId, eventId, new Date())) {
      logger.info("Event archived", {
        requestId: ctx.requestId,
        weddingId: ctx.weddingId,
        eventId,
      });
      return;
    }
    if (!(await eventRepository.findById(ctx.weddingId, eventId))) throw new AppError("NOT_FOUND");
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
   * Throws VALIDATION_ERROR (with `field` in the details) unless every id is an
   * active event of this wedding. Unknown, archived and other weddings' events
   * look the same. Used by tasks, guests, vendors, expenses and photos (DATABASE_DESIGN §83).
   */
  async assertActiveEventsInWedding(
    weddingId: string,
    eventIds: readonly string[],
    field = "eventId",
  ): Promise<void> {
    const unique = [...new Set(eventIds)];
    const active = await eventRepository.findActiveByIds(weddingId, unique);
    if (active.length !== unique.length) {
      throw new AppError("VALIDATION_ERROR", undefined, {
        details: { [field]: "Choose an event of this wedding that is not archived" },
      });
    }
  },

  /** Summaries for embedding in other DTOs, including archived events. */
  async findSummaries(
    weddingId: string,
    eventIds: readonly string[],
  ): Promise<Map<string, EventSummaryDto>> {
    const events = await eventRepository.findByIds(weddingId, [...new Set(eventIds)]);
    return new Map(events.map((event) => [event._id.toString(), toEventSummaryDto(event)]));
  },

  /**
   * A guest's invitation (API_DESIGN §50): only the active events among
   * `eventIds` that belong to this wedding, in start order. Archived events
   * disappear from invitations at once.
   */
  async listPublicEvents(
    weddingId: string,
    eventIds: readonly string[],
  ): Promise<PublicEventDto[]> {
    const events = await eventRepository.findActiveByIds(weddingId, [...new Set(eventIds)]);
    return events
      .sort(
        (a, b) =>
          a.startsAt.getTime() - b.startsAt.getTime() ||
          (a._id.toString() < b._id.toString() ? -1 : 1),
      )
      .map(toPublicEventDto);
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
