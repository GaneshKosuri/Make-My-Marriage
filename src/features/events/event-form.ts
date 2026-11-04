/**
 * The add/edit event form (PRD §9.5). People pick a date and wall-clock times in
 * the wedding's time zone; the API takes UTC instants (DATABASE_DESIGN §33), so
 * this file converts between the two. An end time earlier than the start means
 * the next day (a Sangeet from 8 PM to 1 AM).
 */
import { z } from "zod";

import {
  addDays,
  dateOnlyInTimeZone,
  isValidDateOnly,
  isValidTimeOfDay,
  timeOfDayInTimeZone,
  zonedDateTimeToInstant,
  type DateOnly,
} from "@/lib/dates";
import {
  EVENT_ADDRESS_MAX_LENGTH,
  EVENT_DESCRIPTION_MAX_LENGTH,
  EVENT_DRESS_CODE_MAX_LENGTH,
  EVENT_NAME_MAX_LENGTH,
  EVENT_TYPES,
  EVENT_VENUE_NAME_MAX_LENGTH,
} from "@/modules/events/event.constants";
import {
  END_BEFORE_START_MESSAGE,
  type createEventSchema,
  type updateEventSchema,
} from "@/modules/events/event.schemas";
import type { EventDto } from "@/modules/events/event.types";

const text = (max: number, message: string) => z.string().trim().max(max, message);

export const eventFormSchema = z
  .object({
    type: z.union([z.enum(EVENT_TYPES), z.literal("")]),
    name: text(EVENT_NAME_MAX_LENGTH, "Name is too long").min(1, "Enter the event name"),
    date: z.string().refine(isValidDateOnly, "Choose the date"),
    startTime: z.string().refine(isValidTimeOfDay, "Choose the start time"),
    endTime: z
      .string()
      .refine((value) => value === "" || isValidTimeOfDay(value), "Choose a valid end time"),
    venueName: text(EVENT_VENUE_NAME_MAX_LENGTH, "Venue name is too long"),
    address: text(EVENT_ADDRESS_MAX_LENGTH, "Address is too long"),
    dressCode: text(EVENT_DRESS_CODE_MAX_LENGTH, "Dress code is too long"),
    description: text(EVENT_DESCRIPTION_MAX_LENGTH, "Keep it under 2,000 characters"),
  })
  .strict()
  .superRefine((values, ctx) => {
    if (values.endTime && values.endTime === values.startTime) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: END_BEFORE_START_MESSAGE });
    }
  });

export type EventFormValues = z.input<typeof eventFormSchema>;
type ParsedEventForm = z.output<typeof eventFormSchema>;
export type CreateEventBody = z.input<typeof createEventSchema>;
export type UpdateEventBody = z.input<typeof updateEventSchema>;

/** The fields that make up the start/end instants. */
export const TIMING_FIELDS = ["date", "startTime", "endTime"] as const;
/** The API's field names for VALIDATION_ERROR details, as form fields. */
export const SERVER_FIELD_FOR = {
  name: "name",
  type: "type",
  startsAt: "startTime",
  endsAt: "endTime",
  venueName: "venueName",
  address: "address",
  dressCode: "dressCode",
  description: "description",
} as const satisfies Record<string, keyof EventFormValues>;

/** An end time earlier than the start time is on the following day. */
export function endsNextDay(startTime: string, endTime: string): boolean {
  return isValidTimeOfDay(startTime) && isValidTimeOfDay(endTime) && endTime < startTime;
}

/**
 * A blank form. The date starts on the wedding day, or today once that has
 * passed; 6 PM is a common ceremony start.
 */
export function emptyEventForm(weddingDate: DateOnly, today: DateOnly): EventFormValues {
  return {
    type: "",
    name: "",
    date: weddingDate >= today ? weddingDate : today,
    startTime: "18:00",
    endTime: "",
    venueName: "",
    address: "",
    dressCode: "",
    description: "",
  };
}

/** A stored event as the form edits it, in the wedding's time zone. */
export function eventToForm(event: EventDto, timeZone: string): EventFormValues {
  const startsAt = new Date(event.startsAt);
  return {
    type: event.type ?? "",
    name: event.name,
    date: dateOnlyInTimeZone(startsAt, timeZone),
    startTime: timeOfDayInTimeZone(startsAt, timeZone),
    endTime: event.endsAt ? timeOfDayInTimeZone(new Date(event.endsAt), timeZone) : "",
    venueName: event.venueName ?? "",
    address: event.address ?? "",
    dressCode: event.dressCode ?? "",
    description: event.description ?? "",
  };
}

/** UTC instants for the form's date and times. */
export function formInstants(
  values: Pick<ParsedEventForm, "date" | "startTime" | "endTime">,
  timeZone: string,
): { startsAt: string; endsAt: string | null } {
  const startsAt = zonedDateTimeToInstant(values.date, values.startTime, timeZone);
  if (!values.endTime) return { startsAt: startsAt.toISOString(), endsAt: null };
  const endDate = endsNextDay(values.startTime, values.endTime)
    ? addDays(values.date, 1)
    : values.date;
  return {
    startsAt: startsAt.toISOString(),
    endsAt: zonedDateTimeToInstant(endDate, values.endTime, timeZone).toISOString(),
  };
}

/** POST /api/events body (API_DESIGN §30). */
export function toCreateEventBody(values: ParsedEventForm, timeZone: string): CreateEventBody {
  return {
    name: values.name,
    type: values.type || null,
    ...formInstants(values, timeZone),
    venueName: values.venueName,
    address: values.address,
    dressCode: values.dressCode,
    description: values.description,
  };
}

/**
 * PATCH /api/events/:id body (API_DESIGN §32): only what changed, plus the
 * version the form was loaded from. A change to the date or either time sends
 * both instants, so the pair is always consistent.
 */
export function toUpdateEventBody(
  values: ParsedEventForm,
  dirty: Partial<Record<keyof EventFormValues, boolean | undefined>>,
  timeZone: string,
  version: number,
): UpdateEventBody {
  const body: UpdateEventBody = {};
  if (dirty.name) body.name = values.name;
  if (dirty.type) body.type = values.type || null;
  if (TIMING_FIELDS.some((field) => dirty[field]))
    Object.assign(body, formInstants(values, timeZone));
  for (const field of ["venueName", "address", "dressCode", "description"] as const) {
    if (dirty[field]) body[field] = values[field];
  }
  return { ...body, version };
}
