"use client";

import { CalendarPlus, CheckCircle2, Plus, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import {
  DashboardCard,
  focusRing,
  primaryButton,
} from "@/features/dashboard/components/dashboard-card";
import { timeZoneLabel } from "@/features/weddings/create-wedding-content";
import { cn } from "@/lib/cn";
import type { DateOnly } from "@/lib/dates";
import { EVENT_TYPE_LABELS, type EventType } from "@/modules/events/event.constants";
import type { EventDto } from "@/modules/events/event.types";

import { useEvents } from "../api";
import { EVENTS, EVENTS_ROUTES } from "../events-content";
import { EventFormDialog } from "./event-form-dialog";
import { EventRow } from "./event-row";

/** Occasions offered as one-tap starts when there are no events yet. */
const SUGGESTED: readonly EventType[] = ["MEHENDI", "HALDI", "SANGEET", "WEDDING", "RECEPTION"];

const secondaryButton = cn(
  "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-sand bg-white px-4 text-label-md text-graphite hover:bg-sand",
  focusRing,
);

export interface EventsScreenProps {
  timeZone: string;
  weddingDate: DateOnly;
  /** Today in the wedding's time zone (the add form's default date). */
  today: DateOnly;
  /** The request time (ISO): events that ended before it are past. Kept current on the client. */
  now: string;
  /** Open the add form straight away (`/app/events?new=1`). */
  startAdding?: boolean;
}

/** What the add form starts with, when it is open. */
type Adding = { type?: EventType } | null;

/**
 * /app/events (PRD §9.5, API_DESIGN §29–30): upcoming and past events in the
 * wedding's time zone, archived ones on request, and the add form.
 */
export function EventsScreen({
  timeZone,
  weddingDate,
  today,
  now: serverNow,
  startAdding = false,
}: Readonly<EventsScreenProps>) {
  const now = useCurrentTime(serverNow);
  const router = useRouter();
  const [showArchived, setShowArchived] = useState(false);
  const [adding, setAdding] = useState<Adding>(startAdding ? {} : null);
  const [notice, setNotice] = useState<string | null>(null);
  const events = useEvents(showArchived);

  // "+ Add event" links land here with ?new=1, also from this page (the "+"
  // sheet): open the form each time the flag turns on.
  const [lastStartAdding, setLastStartAdding] = useState(startAdding);
  if (startAdding !== lastStartAdding) {
    setLastStartAdding(startAdding);
    if (startAdding) setAdding({});
  }
  // Then drop the parameter, so a reload or Back doesn't open the form again.
  useEffect(() => {
    if (startAdding) router.replace(EVENTS_ROUTES.list, { scroll: false });
  }, [startAdding, router]);

  const add = (type?: EventType) => {
    setNotice(null);
    setAdding({ type });
  };

  let body;
  if (events.data) {
    body = (
      <EventSections
        events={events.data}
        timeZone={timeZone}
        now={now}
        showArchived={showArchived}
        onAdd={add}
      />
    );
  } else if (events.isError) {
    body = (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-destructive/20 bg-white p-5"
      >
        <p className="text-body-md text-destructive">{EVENTS.loadError.title}</p>
        <button type="button" onClick={() => void events.refetch()} className={secondaryButton}>
          <RefreshCw aria-hidden className={cn("size-4", events.isFetching && "animate-spin")} />
          {EVENTS.loadError.retry}
        </button>
      </div>
    );
  } else {
    body = <ListSkeleton />;
  }

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4 md:gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow text-gold-deep uppercase">{EVENTS.eyebrow}</p>
          <h1 className="mt-1 font-serif text-headline-md text-graphite md:text-headline-lg">
            {EVENTS.title}
          </h1>
          <p className="mt-1 text-body-md text-plum">{EVENTS.description}</p>
          <p className="mt-1 text-body-sm text-plum">
            {EVENTS.timeZoneNote(timeZoneLabel(timeZone))}
          </p>
        </div>
        <button type="button" onClick={() => add()} className={primaryButton}>
          <Plus aria-hidden className="size-4" />
          {EVENTS.add}
        </button>
      </header>

      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-sand bg-white p-4 text-body-md text-graphite"
        >
          <CheckCircle2 aria-hidden className="size-5 shrink-0 text-gold-deep" />
          {notice}
        </p>
      )}

      {body}

      {events.data && (events.data.length > 0 || showArchived) && (
        <div>
          <button
            type="button"
            aria-pressed={showArchived}
            onClick={() => setShowArchived((current) => !current)}
            className={cn(
              "rounded text-label-md text-burgundy underline-offset-4 hover:underline",
              focusRing,
            )}
          >
            {showArchived ? EVENTS.hideArchived : EVENTS.showArchived}
          </button>
        </div>
      )}

      <EventFormDialog
        open={adding !== null}
        onClose={() => setAdding(null)}
        initialType={adding?.type}
        timeZone={timeZone}
        weddingDate={weddingDate}
        today={today}
        onSaved={(event) => {
          setAdding(null);
          setNotice(EVENTS.form.added(event.name));
        }}
      />
    </div>
  );
}

function EventSections({
  events,
  timeZone,
  now,
  showArchived,
  onAdd,
}: Readonly<{
  events: readonly EventDto[];
  timeZone: string;
  now: string;
  showArchived: boolean;
  onAdd: (type?: EventType) => void;
}>) {
  const active = events.filter((event) => event.archivedAt === null);
  const archived = events.filter((event) => event.archivedAt !== null);
  // Still running counts as upcoming, as on the dashboard.
  const hasFinished = (event: EventDto) => (event.endsAt ?? event.startsAt) < now;
  const upcoming = active.filter((event) => !hasFinished(event));
  // Most recent first: the last ceremony is the one people look for.
  const past = active.filter(hasFinished).reverse();

  if (active.length === 0 && archived.length === 0) return <EmptyEvents onAdd={onAdd} />;

  return (
    <>
      {active.length === 0 ? (
        <EmptyEvents onAdd={onAdd} />
      ) : (
        <EventList title={EVENTS.upcoming} events={upcoming} timeZone={timeZone}>
          {upcoming.length === 0 && <p className="text-body-md text-plum">{EVENTS.noUpcoming}</p>}
        </EventList>
      )}
      {past.length > 0 && <EventList title={EVENTS.past} events={past} timeZone={timeZone} />}
      {showArchived && archived.length > 0 && (
        <EventList
          title={EVENTS.archived}
          description={EVENTS.archivedNote}
          events={archived}
          timeZone={timeZone}
        />
      )}
    </>
  );
}

function EventList({
  title,
  description,
  events,
  timeZone,
  children,
}: Readonly<{
  title: string;
  description?: string;
  events: readonly EventDto[];
  timeZone: string;
  children?: ReactNode;
}>) {
  return (
    <DashboardCard title={title} description={description}>
      {children}
      {events.length > 0 && (
        <ul className="divide-y divide-sand border-t border-sand">
          {events.map((event) => (
            <li key={event.id}>
              <EventRow event={event} timeZone={timeZone} />
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}

/** No active events: one clear next step, plus the common ceremonies as shortcuts. */
function EmptyEvents({ onAdd }: Readonly<{ onAdd: (type?: EventType) => void }>) {
  return (
    <div className="rounded-3xl border border-dashed border-sand bg-white px-5 py-10 text-center">
      <CalendarPlus aria-hidden className="mx-auto size-8 text-gold-deep" />
      <p className="mt-3 font-serif text-title-lg text-graphite">{EVENTS.empty.title}</p>
      <p className="mx-auto mt-1 max-w-sm text-body-md text-plum">{EVENTS.empty.description}</p>
      <button type="button" onClick={() => onAdd()} className={cn(primaryButton, "mt-5")}>
        {EVENTS.empty.action}
      </button>
      <p className="mt-6 text-body-sm text-plum">{EVENTS.empty.suggestions}</p>
      <ul className="mt-2 flex flex-wrap justify-center gap-2">
        {SUGGESTED.map((type) => (
          <li key={type}>
            <button type="button" onClick={() => onAdd(type)} className={secondaryButton}>
              <Plus aria-hidden className="size-4" />
              {EVENT_TYPE_LABELS[type]}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className="animate-pulse rounded-3xl border border-sand bg-white p-5 md:p-7"
    >
      <div className="h-5 w-32 rounded bg-sand" />
      {[0, 1, 2].map((row) => (
        <div key={row} className="mt-5 flex gap-4">
          <div className="h-16 w-14 rounded-xl bg-sand" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-4 w-40 rounded bg-sand" />
            <div className="h-3 w-56 rounded bg-sand" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Re-check the time every minute while the page is open. */
const CLOCK_INTERVAL_MS = 60_000;

/**
 * The current time (ISO), starting from the server's so the first render
 * matches, then kept current every minute and whenever the window regains
 * focus, so an event that ends while the page is open moves to Past.
 */
function useCurrentTime(serverNow: string): string {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const tick = () => setNow(new Date().toISOString());
    const timer = window.setInterval(tick, CLOCK_INTERVAL_MS);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", tick);
    };
  }, []);
  return now;
}
