import {
  addDays,
  dateOnlyInTimeZone,
  formatDateOnly,
  formatInstant,
  type DateOnly,
} from "@/lib/dates";

/** Clock times read "4:00 PM" as in the designs (en-IN would print "4:00 pm"). */
const TIME: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
const TIME_LOCALE = "en-US";

/** "4:00 PM – 8:00 PM" in the wedding's time zone, or just the start time. */
export function eventTimeRange(
  event: { startsAt: string; endsAt: string | null },
  timeZone: string,
): string {
  const start = formatInstant(event.startsAt, timeZone, TIME, TIME_LOCALE);
  return event.endsAt
    ? `${start} – ${formatInstant(event.endsAt, timeZone, TIME, TIME_LOCALE)}`
    : start;
}

/** The parts of an event's date tile ("12", "Feb", "2027") in the wedding's time zone. */
export function eventDateTile(startsAt: string, timeZone: string) {
  const day = dateOnlyInTimeZone(new Date(startsAt), timeZone);
  return {
    day: formatDateOnly(day, { day: "numeric" }),
    month: formatDateOnly(day, { month: "short" }),
    year: formatDateOnly(day, { year: "numeric" }),
    label: formatDateOnly(day, { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
  };
}

/** A task's due date as the wedding-local calendar day (API_DESIGN §35). */
export function taskDueDay(dueDate: string, timeZone: string): DateOnly {
  return dateOnlyInTimeZone(new Date(dueDate), timeZone);
}

/** "30 Dec 2026". */
export function formatShortDate(day: DateOnly): string {
  return formatDateOnly(day, { day: "numeric", month: "short", year: "numeric" });
}

/** Overdue: an incomplete task whose wedding-local due date is before today (API_DESIGN §35). */
export function isOverdue(
  task: { status: string; dueDate: string | null },
  today: DateOnly,
  timeZone: string,
): boolean {
  return (
    task.status !== "COMPLETED" &&
    task.dueDate !== null &&
    taskDueDay(task.dueDate, timeZone) < today
  );
}

/** Shown after an end time that falls on the next day. */
const NEXT_DAY = "next day";

/**
 * When an event happens, in the wedding's time zone: "Friday, 12 February 2027"
 * and "8:00 PM – 1:00 AM (next day)". An end more than a day later names its date.
 */
export function eventSchedule(
  event: { startsAt: string; endsAt: string | null },
  timeZone: string,
): { date: string; time: string } {
  const startDay = dateOnlyInTimeZone(new Date(event.startsAt), timeZone);
  const date = formatDateOnly(startDay, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const endDay = event.endsAt ? dateOnlyInTimeZone(new Date(event.endsAt), timeZone) : startDay;
  if (endDay === startDay) return { date, time: eventTimeRange(event, timeZone) };
  if (endDay === addDays(startDay, 1)) {
    return { date, time: `${eventTimeRange(event, timeZone)} (${NEXT_DAY})` };
  }
  const time = (instant: string) => eventTimeRange({ startsAt: instant, endsAt: null }, timeZone);
  const endDate = formatDateOnly(endDay, { day: "numeric", month: "short" });
  return { date, time: `${time(event.startsAt)} – ${endDate}, ${time(event.endsAt!)}` };
}

/** A Google Maps search for the venue and address (no API key needed). */
export function mapsSearchUrl(event: { venueName: string | null; address: string | null }) {
  const query = [event.venueName, event.address].filter(Boolean).join(", ");
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null;
}
