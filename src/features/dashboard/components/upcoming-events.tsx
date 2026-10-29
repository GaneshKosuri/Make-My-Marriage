import { ChevronRight, MapPin, Plus } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/cn";
import type { EventDto } from "@/modules/events/event.types";

import { DASHBOARD, DASHBOARD_ROUTES } from "../dashboard-content";
import { eventDateTile, eventTimeRange } from "../format";
import { ArrowLink, DashboardCard, EmptyState, focusRing, textLink } from "./dashboard-card";

/** PRD §9.3 "Upcoming Events": the nearest ceremonies with time, venue and dress code. */
export function UpcomingEvents({
  events,
  timeZone,
}: Readonly<{ events: readonly EventDto[]; timeZone: string }>) {
  const copy = DASHBOARD.events;
  return (
    <DashboardCard
      title={copy.title}
      actions={
        events.length > 0 && (
          <Link href={DASHBOARD_ROUTES.events} className={textLink}>
            <Plus aria-hidden className="size-4" />
            {copy.add}
          </Link>
        )
      }
    >
      {events.length === 0 ? (
        <EmptyState
          title={copy.empty.title}
          description={copy.empty.description}
          action={{ label: copy.empty.action, href: DASHBOARD_ROUTES.events }}
        />
      ) : (
        <>
          <ul className="divide-y divide-sand border-t border-sand">
            {events.map((event) => (
              <li key={event.id}>
                <EventRow event={event} timeZone={timeZone} />
              </li>
            ))}
          </ul>
          <div className="border-t border-sand pt-4">
            <ArrowLink href={DASHBOARD_ROUTES.events}>{copy.all}</ArrowLink>
          </div>
        </>
      )}
    </DashboardCard>
  );
}

function EventRow({ event, timeZone }: Readonly<{ event: EventDto; timeZone: string }>) {
  const date = eventDateTile(event.startsAt, timeZone);
  return (
    <Link
      href={DASHBOARD_ROUTES.event(event.id)}
      className={cn("group flex items-start gap-4 rounded-xl py-4", focusRing)}
    >
      <span
        aria-hidden
        className="flex w-14 shrink-0 flex-col items-center rounded-xl border border-sand bg-ivory py-2 text-graphite"
      >
        <span className="text-label-sm text-plum uppercase">{date.month}</span>
        <span className="font-serif text-title-lg leading-tight">{date.day}</span>
        <span className="text-[10px] text-plum">{date.year}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-serif text-title-lg text-graphite group-hover:text-burgundy">
            {event.name}
          </span>
          <span className="rounded-full border border-sand px-2.5 py-0.5 text-body-sm text-plum">
            {eventTimeRange(event, timeZone)}
          </span>
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
            {DASHBOARD.events.dressCode}: {event.dressCode}
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
