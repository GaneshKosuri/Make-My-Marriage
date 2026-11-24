import { weddingCountdownLabel } from "@/lib/couple";
import { daysUntil, formatDateOnly, formatInstant } from "@/lib/dates";
import type { PublicWebsiteEventDto, PublicWeddingDto } from "@/modules/weddings/wedding.types";

/**
 * What every theme shows, in the same words (SYSTEM_DESIGN §28: themes change
 * presentation, never content). Each theme lays these out its own way.
 */
export const THEME_COPY = {
  celebrating: "Celebrating the wedding of",
  welcome: "Welcome",
  events: "The Celebrations",
  noEvents: "Details coming soon",
  dressCode: (dressCode: string) => `Dress code: ${dressCode}`,
  maps: "Open in Google Maps",
  daysToGo: (days: number) => (days === 1 ? "day to go" : "days to go"),
  watchLive: "Watch live",
  live: "Live",
  watchLiveHint: "Can't be there? Watch the ceremony live.",
  playerTitle: (title: string) => `${title} livestream`,
  photos: "Wedding photos",
  photosHint: "See the photos and add your own.",
  photosButton: "See and add photos",
  coverAlt: (title: string) => title,
  withLove: (title: string) => `With love, ${title}`,
  madeWith: "Made with Make My Marriage",
} as const;

/** The couple as the website shows them: the family's title, or "Groom & Bride". */
export const siteTitle = (wedding: PublicWeddingDto) =>
  wedding.title ?? `${wedding.groomName} & ${wedding.brideName}`;

/** "14 February 2027" and "Sunday, 14 February 2027". */
export const weddingDay = (wedding: PublicWeddingDto) => formatDateOnly(wedding.weddingDate);
export const weddingDayLong = (wedding: PublicWeddingDto) =>
  formatDateOnly(wedding.weddingDate, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/** "82 days to go", "Tomorrow!", "Today!", or null once married (the website stays up). */
export function countdown(wedding: PublicWeddingDto, now = new Date()): string | null {
  const days = daysUntil(wedding.weddingDate, wedding.timeZone, now);
  return days < 0 ? null : weddingCountdownLabel(days);
}

/** Just the number of days left, for themes that make it big; null on or after the day. */
export function daysLeft(wedding: PublicWeddingDto, now = new Date()): number | null {
  const days = daysUntil(wedding.weddingDate, wedding.timeZone, now);
  return days > 0 ? days : null;
}

/** "Fri, 12 Feb 2027" in the wedding's time zone. */
export function eventDate(event: PublicWebsiteEventDto, timeZone: string): string {
  return formatInstant(event.startsAt, timeZone, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "4:00 pm – 9:00 pm", or "7:30 pm onwards" without an end. */
export function eventTimes(event: PublicWebsiteEventDto, timeZone: string): string {
  const time = (instant: string) =>
    formatInstant(instant, timeZone, { hour: "numeric", minute: "2-digit" });
  return event.endsAt
    ? `${time(event.startsAt)} – ${time(event.endsAt)}`
    : `${time(event.startsAt)} onwards`;
}

/** A date block: "12" and "Feb" (and the year) in the wedding's time zone. */
export function eventDayParts(event: PublicWebsiteEventDto, timeZone: string) {
  return {
    day: formatInstant(event.startsAt, timeZone, { day: "numeric" }),
    month: formatInstant(event.startsAt, timeZone, { month: "short" }),
    year: formatInstant(event.startsAt, timeZone, { year: "numeric" }),
  };
}

/** "Sat, 13 Feb 2027, 7:30 pm – 10:00 pm" in the wedding's time zone. */
export function formatEventTime(event: PublicWebsiteEventDto, timeZone: string): string {
  return `${eventDate(event, timeZone)}, ${eventTimes(event, timeZone)}`;
}

/** The venue line: "Royal Garden, Rajpur Road" from whatever is set. */
export function eventPlace(event: PublicWebsiteEventDto): string | null {
  const parts = [event.venueName, event.address].map((part) => part?.trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

/** The cover photo, from a short-lived signed link. */
export function CoverImage({
  wedding,
  className,
}: Readonly<{ wedding: PublicWeddingDto; className?: string }>) {
  if (!wedding.coverImageUrl) return null;
  return (
    // A signed storage link: next/image cannot optimise it.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={wedding.coverImageUrl}
      alt={THEME_COPY.coverAlt(siteTitle(wedding))}
      className={className}
    />
  );
}
