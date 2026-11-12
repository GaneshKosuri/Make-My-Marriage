import { addDays, dateOnlyInTimeZone, formatDateOnly } from "@/lib/dates";
import { eventTimeRange } from "@/lib/schedule";

import { EVENTS } from "./events-content";

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
    return { date, time: `${eventTimeRange(event, timeZone)} (${EVENTS.detail.nextDay})` };
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
