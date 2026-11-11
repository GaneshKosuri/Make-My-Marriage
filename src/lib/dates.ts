/**
 * Date helpers.
 *
 * - Date-only values (wedding date, expense date) are `YYYY-MM-DD` strings and
 *   are never shifted through a local time zone (DATABASE_DESIGN §14).
 * - Instants (event start/end, task due) are UTC and rendered in the wedding's
 *   IANA time zone (DATABASE_DESIGN §15, §33).
 */

export type DateOnly = string;

export const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
export const DEFAULT_LOCALE = "en-IN";
const MS_PER_DAY = 86_400_000;

export interface DateParts {
  year: number;
  month: number; // 1–12
  day: number;
}

/**
 * Midnight UTC of a calendar day. `Date.UTC` reads years 0–99 as 1900–1999, so
 * the year is set separately (a year typed digit by digit passes through 2, 20, 202).
 */
function utcMidnight(year: number, month: number, day: number): Date {
  const date = new Date(Date.UTC(2000, month - 1, day));
  date.setUTCFullYear(year, month - 1, day);
  return date;
}

/** Parses `YYYY-MM-DD`, rejecting impossible calendar dates such as 2027-02-30. */
export function parseDateOnly(value: string): DateParts {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) throw new RangeError(`Expected a YYYY-MM-DD date, got "${value}"`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = utcMidnight(year, month, day);
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    throw new RangeError(`"${value}" is not a valid calendar date`);
  }
  return { year, month, day };
}

export function isValidDateOnly(value: unknown): value is DateOnly {
  if (typeof value !== "string") return false;
  try {
    parseDateOnly(value);
    return true;
  } catch {
    return false;
  }
}

/** Midnight UTC of a date-only value — a timezone-free storage/comparison form. */
export function dateOnlyToUtcDate(value: DateOnly): Date {
  const { year, month, day } = parseDateOnly(value);
  return utcMidnight(year, month, day);
}

/** Inverse of `dateOnlyToUtcDate`. */
export function utcDateToDateOnly(date: Date): DateOnly {
  return date.toISOString().slice(0, 10);
}

/** "2027-02-14" → "14 February 2027", identical in every runtime time zone. */
export function formatDateOnly(
  value: DateOnly,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" },
  locale: string = DEFAULT_LOCALE,
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(
    dateOnlyToUtcDate(value),
  );
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Renders a UTC instant in the wedding's time zone. */
export function formatInstant(
  instant: Date | string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" },
  locale: string = DEFAULT_LOCALE,
): string {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  if (Number.isNaN(date.getTime())) throw new RangeError("Invalid instant");
  return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(date);
}

/** The calendar date (`YYYY-MM-DD`) an instant falls on in `timeZone`. */
export function dateOnlyInTimeZone(instant: Date, timeZone: string): DateOnly {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * Whole calendar days from "today in `timeZone`" until `date`.
 * 0 on the day itself, negative once it has passed (dashboard countdown, PRD §9.3).
 */
export function daysUntil(date: DateOnly, timeZone: string, now: Date = new Date()): number {
  const today = dateOnlyToUtcDate(dateOnlyInTimeZone(now, timeZone));
  return Math.round((dateOnlyToUtcDate(date).getTime() - today.getTime()) / MS_PER_DAY);
}

/** A wall-clock time of day, `HH:mm` (24-hour), as `<input type="time">` gives it. */
export const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTimeOfDay(value: unknown): value is string {
  return typeof value === "string" && TIME_OF_DAY_PATTERN.test(value);
}

/** `date` moved by whole calendar days ("2027-02-28" + 1 → "2027-03-01"). */
export function addDays(date: DateOnly, days: number): DateOnly {
  return utcDateToDateOnly(new Date(dateOnlyToUtcDate(date).getTime() + days * MS_PER_DAY));
}

/** How far `timeZone`'s wall clock is ahead of UTC at `instant`, in ms. */
function timeZoneOffsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const wallClock = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return wallClock - (instant - (((instant % 1000) + 1000) % 1000));
}

/**
 * The UTC instant at which the wall clock in `timeZone` reads `date` `time`
 * (event start and end times, DATABASE_DESIGN §33). A time skipped by a
 * daylight-saving change resolves to the instant just after the gap.
 */
export function zonedDateTimeToInstant(date: DateOnly, time: string, timeZone: string): Date {
  const { year, month, day } = parseDateOnly(date);
  const match = TIME_OF_DAY_PATTERN.exec(time);
  if (!match) throw new RangeError(`Expected an HH:mm time, got "${time}"`);
  const wallClock = Date.UTC(year, month - 1, day, Number(match[1]), Number(match[2]));
  let instant = wallClock - timeZoneOffsetMs(wallClock, timeZone);
  // The offset at the result can differ near a daylight-saving change.
  const offset = timeZoneOffsetMs(instant, timeZone);
  if (wallClock - offset !== instant) instant = wallClock - offset;
  return new Date(instant);
}

/** The wall-clock time (`HH:mm`, 24-hour) an instant shows in `timeZone`. */
export function timeOfDayInTimeZone(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("hour")}:${get("minute")}`;
}
