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

/** Parses `YYYY-MM-DD`, rejecting impossible calendar dates such as 2027-02-30. */
export function parseDateOnly(value: string): DateParts {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) throw new RangeError(`Expected a YYYY-MM-DD date, got "${value}"`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
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
  return new Date(Date.UTC(year, month - 1, day));
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
