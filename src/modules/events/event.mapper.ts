import "server-only";

import type { EventRecord } from "./event.model";
import type { EventDto, EventSummaryDto } from "./event.types";

/**
 * Event document → DTO (API_DESIGN §29–33): ISO strings for instants, `version`
 * from `__v`, never `weddingId`.
 */
export function toEventDto(event: EventRecord): EventDto {
  return {
    id: event._id.toString(),
    name: event.name,
    type: event.type ?? null,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt?.toISOString() ?? null,
    venueName: event.venueName ?? null,
    address: event.address ?? null,
    description: event.description ?? null,
    dressCode: event.dressCode ?? null,
    archivedAt: event.archivedAt?.toISOString() ?? null,
    version: event.__v,
  };
}

export function toEventSummaryDto(event: EventRecord): EventSummaryDto {
  return {
    id: event._id.toString(),
    name: event.name,
    startsAt: event.startsAt.toISOString(),
    archivedAt: event.archivedAt?.toISOString() ?? null,
  };
}
