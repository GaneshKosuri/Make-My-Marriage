import { ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";

import { focusRing } from "@/features/dashboard/components/dashboard-card";
import { eventDateTile } from "@/features/dashboard/format";
import { cn } from "@/lib/cn";
import type { EventDto } from "@/modules/events/event.types";

import { EVENTS, EVENTS_ROUTES } from "../events-content";
import { eventSchedule } from "../format";

/**
 * One event as a link to its page: date tile, name, time range, venue and
 * dress code in the wedding's time zone. Used by the dashboard and /app/events.
 */
export function EventRow({ event, timeZone }: Readonly<{ event: EventDto; timeZone: string }>) {
  const date = eventDateTile(event.startsAt, timeZone);
  const archived = event.archivedAt !== null;
  return (
    <Link
      href={EVENTS_ROUTES.event(event.id)}
      className={cn("group flex items-start gap-4 rounded-xl py-4", focusRing)}
    >
      <span
        aria-hidden
        className={cn(
          "flex w-14 shrink-0 flex-col items-center rounded-xl border border-sand bg-ivory py-2 text-graphite",
          archived && "opacity-60",
        )}
      >
        <span className="text-label-sm text-plum uppercase">{date.month}</span>
        <span className="font-serif text-title-lg leading-tight">{date.day}</span>
        <span className="text-[10px] text-plum">{date.year}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span
            className={cn(
              "font-serif text-title-lg text-graphite group-hover:text-burgundy",
              archived && "text-plum",
            )}
          >
            {event.name}
          </span>
          <span className="rounded-full border border-sand px-2.5 py-0.5 text-body-sm text-plum">
            {/* Same wording as the event page: "(next day)", or the end date when later. */}
            {eventSchedule(event, timeZone).time}
          </span>
          {archived && (
            <span className="rounded-full bg-sand px-2.5 py-0.5 text-label-sm text-plum">
              {EVENTS.archivedBadge}
            </span>
          )}
        </span>
        <span className="sr-only">{date.label}</span>
        {(event.venueName || event.address) && (
          <span className="mt-1 flex items-center gap-1.5 text-body-md text-plum">
            <MapPin aria-hidden className="size-4 shrink-0 text-gold-deep" />
            <span className="truncate">{event.venueName ?? event.address}</span>
          </span>
        )}
        {event.dressCode && (
          <span className="mt-1 block text-body-sm text-plum">
            {EVENTS.dressCode}: {event.dressCode}
          </span>
        )}
      </span>
      <ChevronRight
        aria-hidden
        className="mt-1 size-5 shrink-0 text-plum group-hover:text-burgundy"
      />
    </Link>
  );
}
