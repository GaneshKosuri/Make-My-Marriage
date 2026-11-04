/**
 * Event request schemas (Zod, `.strict()`). Isomorphic: the event form reuses
 * them. A client-supplied `weddingId` is never accepted.
 */
import { z } from "zod";

import { objectId } from "@/lib/object-id";

import {
  EVENT_ADDRESS_MAX_LENGTH,
  EVENT_DESCRIPTION_MAX_LENGTH,
  EVENT_DRESS_CODE_MAX_LENGTH,
  EVENT_NAME_MAX_LENGTH,
  EVENT_TYPES,
  EVENT_VENUE_NAME_MAX_LENGTH,
} from "./event.constants";

export const eventIdParams = z.object({ eventId: objectId }).strict();

/** An ISO date-time with an explicit offset (`Z` or `+05:30`), API_DESIGN §30. */
const instant = (message: string) => z.iso.datetime({ offset: true, message });

const eventName = z
  .string()
  .trim()
  .min(1, "Enter the event name")
  .max(EVENT_NAME_MAX_LENGTH, "Name is too long");

/** Optional free text: blank means "not set" (and clears it on update). */
const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message).optional();

const eventFields = {
  name: eventName,
  type: z.enum(EVENT_TYPES, "Choose an event type").nullable().optional(),
  startsAt: instant("Choose when the event starts"),
  endsAt: instant("Choose a valid end time").nullable().optional(),
  venueName: optionalText(EVENT_VENUE_NAME_MAX_LENGTH, "Venue name is too long"),
  address: optionalText(EVENT_ADDRESS_MAX_LENGTH, "Address is too long"),
  description: optionalText(EVENT_DESCRIPTION_MAX_LENGTH, "Keep it under 2,000 characters"),
  dressCode: optionalText(EVENT_DRESS_CODE_MAX_LENGTH, "Dress code is too long"),
};

export const END_BEFORE_START_MESSAGE = "End the event after it starts";

/** True when both instants are set and the end is not strictly after the start. */
export function endsBeforeStart(startsAt: string, endsAt: string | null | undefined): boolean {
  return endsAt != null && new Date(endsAt).getTime() <= new Date(startsAt).getTime();
}

/** API_DESIGN §30. */
export const createEventSchema = z
  .object(eventFields)
  .strict()
  .superRefine((input, ctx) => {
    if (endsBeforeStart(input.startsAt, input.endsAt)) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: END_BEFORE_START_MESSAGE });
    }
  });

/**
 * API_DESIGN §32: at least one field. `version` is the one last read (binding
 * decision 8): when it is stale the update is refused with CONFLICT. Without it
 * the service still checks the version atomically between its read and write.
 * The start/end pair is checked by the service after merging with the stored event.
 */
export const updateEventSchema = z
  .object({
    ...eventFields,
    name: eventName.optional(),
    startsAt: eventFields.startsAt.optional(),
    version: z.number("Reload the event and try again").int().min(0).optional(),
  })
  .strict()
  .refine(
    (input) => Object.keys(input).some((key) => key !== "version"),
    "Send at least one field to change",
  );

const queryFlag = z.enum(["true", "false"]).transform((value) => value === "true");

/**
 * API_DESIGN §29. `from`/`to` keep events that start in [from, to); archived
 * events are left out unless `includeArchived=true`.
 */
export const listEventsQuerySchema = z
  .object({
    includeArchived: queryFlag.default(false),
    from: instant("Invalid date-time").optional(),
    to: instant("Invalid date-time").optional(),
  })
  .strict()
  .superRefine((query, ctx) => {
    if (query.from && query.to && new Date(query.to) <= new Date(query.from)) {
      ctx.addIssue({ code: "custom", path: ["to"], message: "Must be after from" });
    }
  });
