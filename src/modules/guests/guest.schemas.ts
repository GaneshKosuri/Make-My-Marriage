/**
 * Guest, invitation and RSVP request schemas (Zod, `.strict()`). Isomorphic:
 * the guest form reuses them. A client-supplied `weddingId`, token, RSVP or
 * delivery field is never accepted (API_DESIGN §39 notes, §42).
 */
import { z } from "zod";

import { objectId } from "@/lib/object-id";
import { pageQuerySchema } from "@/lib/pagination";
import { queryFlag } from "@/lib/query";

import {
  GUEST_DEFAULT_MAX_GUESTS,
  GUEST_EMAIL_MAX_LENGTH,
  GUEST_MAX_GUESTS_MAX,
  GUEST_MAX_GUESTS_MIN,
  GUEST_MAX_INVITED_EVENTS,
  GUEST_NAME_MAX_LENGTH,
  GUEST_NOTES_MAX_LENGTH,
  GUEST_PHONE_MAX_LENGTH,
  GUEST_PHONE_PATTERN,
  GUEST_SEARCH_MAX_LENGTH,
  RSVP_STATUSES,
} from "./guest.constants";

export const guestIdParams = z.object({ guestId: objectId }).strict();

const name = z
  .string()
  .trim()
  .min(1, "Enter the guest's name")
  .max(GUEST_NAME_MAX_LENGTH, "Keep the name under 120 characters");

/** Optional contact and notes fields: blank (or null) means "not set" and clears it on update. */
const email = z
  .string()
  .trim()
  .max(GUEST_EMAIL_MAX_LENGTH, "Email address is too long")
  .pipe(z.union([z.literal(""), z.email("Enter a valid email address")]))
  .nullable()
  .optional();

const phone = z
  .string()
  .trim()
  .max(GUEST_PHONE_MAX_LENGTH, "Phone number is too long")
  .regex(GUEST_PHONE_PATTERN, "Use digits and + ( ) - . only")
  .nullable()
  .optional();

const notes = z
  .string()
  .trim()
  .max(GUEST_NOTES_MAX_LENGTH, "Keep notes under 2,000 characters")
  .nullable()
  .optional();

/** How many people the invitation covers, including the named guest. */
const maxGuests = z
  .number("Enter how many people are invited")
  .int("Enter a whole number")
  .min(GUEST_MAX_GUESTS_MIN, "At least 1 person")
  .max(GUEST_MAX_GUESTS_MAX, "That is more than 10,000 people");

/** Duplicates are dropped; `[]` invites to no events. */
const invitedEventIds = z
  .array(objectId)
  .transform((ids) => [...new Set(ids)])
  .pipe(z.array(z.string()).max(GUEST_MAX_INVITED_EVENTS, "Choose at most 100 events"));

/** API_DESIGN §40: party size defaults to 1, events to none. */
export const createGuestSchema = z
  .object({
    name,
    email,
    phone,
    maxGuests: maxGuests.default(GUEST_DEFAULT_MAX_GUESTS),
    invitedEventIds: invitedEventIds.default([]),
    notes,
  })
  .strict();

/**
 * API_DESIGN §42: at least one field. `version` is the one last read (binding
 * decision 8): when it is stale the update is refused with CONFLICT; without it
 * the service still checks the version atomically between its read and write.
 */
export const updateGuestSchema = z
  .object({
    name: name.optional(),
    email,
    phone,
    maxGuests: maxGuests.optional(),
    invitedEventIds: invitedEventIds.optional(),
    notes,
    version: z.number("Reload the guest and try again").int().min(0).optional(),
  })
  .strict()
  .refine(
    (input) => Object.keys(input).some((key) => key !== "version"),
    "Send at least one field to change",
  );

/**
 * API_DESIGN §39: page + filters that combine with AND. `search` matches name,
 * email or phone literally (no patterns); blank means no search.
 */
export const listGuestsQuerySchema = pageQuerySchema
  .extend({
    search: z
      .string()
      .trim()
      .max(GUEST_SEARCH_MAX_LENGTH, "Search is too long")
      .transform((value) => value || undefined)
      .optional(),
    rsvpStatus: z.enum(RSVP_STATUSES).optional(),
    eventId: objectId.optional(),
    invitationSent: queryFlag.optional(),
  })
  .strict();

/*
 * TODO(Phase 3: Guests, slices 3–4) — define with `.strict()`:
 *   - bulkSendSchema              API_DESIGN §47  { scope: ALL_UNSENT | ALL_PENDING_RSVP | SELECTED, guestIds? }
 *   - submitRsvpSchema            API_DESIGN §51  ATTENDING: 1 ≤ attendingCount ≤ maxGuests (service-checked);
 *                                                 NOT_ATTENDING: attendingCount = 0
 */
