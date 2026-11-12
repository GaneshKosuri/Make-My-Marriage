/**
 * Reads /app/guests search params into filters, ignoring anything unexpected
 * (a stale or hand-edited link just shows every guest).
 */
import { OBJECT_ID_PATTERN } from "@/lib/object-id";
import {
  GUEST_SEARCH_MAX_LENGTH,
  RSVP_STATUSES,
  type RsvpStatus,
} from "@/modules/guests/guest.constants";

import { GUESTS_PARAMS, INVITATION_SENT_OPTIONS } from "./guests-content";

type SearchParams = Record<string, string | string[] | undefined>;

export interface GuestFilters {
  search?: string;
  rsvpStatus?: RsvpStatus;
  eventId?: string;
  /** "true" (sent) or "false" (not sent), as the address and the select carry it. */
  invitationSent?: (typeof INVITATION_SENT_OPTIONS)[number];
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const oneOf = <T extends string>(options: readonly T[], value: string | undefined) =>
  options.includes(value as T) ? (value as T) : undefined;

export function readGuestsUrl(params: SearchParams): {
  filters: GuestFilters;
  startAdding: boolean;
} {
  const search = first(params[GUESTS_PARAMS.search])?.trim().slice(0, GUEST_SEARCH_MAX_LENGTH);
  const eventId = first(params[GUESTS_PARAMS.eventId]);
  const filters: GuestFilters = {
    search: search || undefined,
    rsvpStatus: oneOf(RSVP_STATUSES, first(params[GUESTS_PARAMS.rsvpStatus])),
    eventId: eventId && OBJECT_ID_PATTERN.test(eventId) ? eventId : undefined,
    invitationSent: oneOf(INVITATION_SENT_OPTIONS, first(params[GUESTS_PARAMS.invitationSent])),
  };
  for (const key of Object.keys(filters) as (keyof GuestFilters)[]) {
    if (filters[key] === undefined) delete filters[key];
  }
  return { filters, startAdding: first(params[GUESTS_PARAMS.add]) === "1" };
}

/** The address for these filters, so the list can be shared or reloaded. */
export function guestsUrlFor(list: string, filters: GuestFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const search = params.toString();
  return search ? `${list}?${search}` : list;
}
