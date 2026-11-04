/**
 * Event DTOs and inputs (API_DESIGN §29–33). Isomorphic.
 */
import type { z } from "zod";

import type { EventType } from "./event.constants";
import type { createEventSchema, listEventsQuerySchema, updateEventSchema } from "./event.schemas";

export interface EventDto {
  id: string;
  name: string;
  type: EventType | null;
  startsAt: string;
  endsAt: string | null;
  venueName: string | null;
  address: string | null;
  description: string | null;
  dressCode: string | null;
  archivedAt: string | null;
  /** Optimistic-concurrency version; send back on PATCH (binding decision 8). */
  version: number;
}

/** Embedded in task/guest/photo responses. */
export interface EventSummaryDto {
  id: string;
  name: string;
  startsAt: string;
  archivedAt: string | null;
}

export type ListEventsQuery = z.output<typeof listEventsQuerySchema>;
export type CreateEventInput = z.output<typeof createEventSchema>;
export type UpdateEventInput = z.output<typeof updateEventSchema>;
