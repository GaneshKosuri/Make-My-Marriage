/**
 * The add/edit event form (PRD §9.5). People pick a date and wall-clock times in
 * the wedding's time zone; the API takes UTC instants (DATABASE_DESIGN §33), so
 * this file converts between the two. Without an end date, an end time earlier
 * than the start means the next day (a Sangeet from 8 PM to 1 AM); an end date
 * covers longer events.
 */
import { z } from "zod";

import {
  addDays,
  dateOnlyInTimeZone,
  dateOnlyToUtcDate,
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
    /** Blank: the start day, or the next day when the end time is earlier. */
    endDate: z
      .string()
      .refine((value) => value === "" || isValidDateOnly(value), "Choose a valid end date"),
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
    const { date, startTime, endDate, endTime } = values;
    if (endDate && !endTime) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "Choose the end time" });
      return;
    }
    if (!endTime || !isValidDateOnly(date) || !isValidTimeOfDay(startTime)) return;
    if (endDate && endDate < date) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: END_DATE_BEFORE_START_MESSAGE });
    } else if (endDate === date ? endTime <= startTime : !endDate && endTime === startTime) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: END_BEFORE_START_MESSAGE });
    }
  });

export const END_DATE_BEFORE_START_MESSAGE = "End on or after the start date";

export type EventFormValues = z.input<typeof eventFormSchema>;
type ParsedEventForm = z.output<typeof eventFormSchema>;
export type CreateEventBody = z.input<typeof createEventSchema>;
export type UpdateEventBody = z.input<typeof updateEventSchema>;

/** The fields that make up the start/end instants. */
export const TIMING_FIELDS = ["date", "startTime", "endDate", "endTime"] as const;
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

/** Without an end date, an end time earlier than the start time is on the following day. */
export function endsNextDay(startTime: string, endTime: string): boolean {
  return isValidTimeOfDay(startTime) && isValidTimeOfDay(endTime) && endTime < startTime;
}

/**
 * The end date after the start date moves from `from` to `to`: it moves by the
 * same number of days, so a two-day event stays two days long.
 */
export function moveEndDate(endDate: DateOnly, from: DateOnly, to: DateOnly): DateOnly {
  const days = Math.round(
    (dateOnlyToUtcDate(to).getTime() - dateOnlyToUtcDate(from).getTime()) / 86_400_000,
  );
  return addDays(endDate, days);
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
    endDate: "",
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
  const date = dateOnlyInTimeZone(startsAt, timeZone);
  const startTime = timeOfDayInTimeZone(startsAt, timeZone);
  const endsAt = event.endsAt ? new Date(event.endsAt) : null;
  const endTime = endsAt ? timeOfDayInTimeZone(endsAt, timeZone) : "";
  const endDay = endsAt ? dateOnlyInTimeZone(endsAt, timeZone) : date;
  // The end date is left blank when the same-day / next-day rule gives it anyway.
  const implied = endsNextDay(startTime, endTime) ? addDays(date, 1) : date;
  return {
    type: event.type ?? "",
    name: event.name,
    date,
    startTime,
    endDate: endDay === implied ? "" : endDay,
    endTime,
    venueName: event.venueName ?? "",
    address: event.address ?? "",
    dressCode: event.dressCode ?? "",
    description: event.description ?? "",
  };
}

/** UTC instants for the form's date and times. */
export function formInstants(
  values: Pick<ParsedEventForm, "date" | "startTime" | "endDate" | "endTime">,
  timeZone: string,
): { startsAt: string; endsAt: string | null } {
  const startsAt = zonedDateTimeToInstant(values.date, values.startTime, timeZone);
  if (!values.endTime) return { startsAt: startsAt.toISOString(), endsAt: null };
  const endDate =
    values.endDate ||
    (endsNextDay(values.startTime, values.endTime) ? addDays(values.date, 1) : values.date);
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
