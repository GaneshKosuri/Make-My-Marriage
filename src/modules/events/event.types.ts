/**
 * Event DTOs and inputs (API_DESIGN §29–33). Isomorphic.
 * TODO(Phase 2): derive inputs from ./event.schemas.ts with z.infer.
 */
import type { EventType } from "./event.constants";

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

export interface ListEventsQuery {
  includeArchived?: boolean;
  from?: string;
  to?: string;
}

export interface CreateEventInput {
  name: string;
  type?: EventType | null;
  startsAt: string;
  endsAt?: string | null;
  venueName?: string;
  address?: string;
  description?: string;
  dressCode?: string;
}

export type UpdateEventInput = Partial<CreateEventInput> & { version: number };
