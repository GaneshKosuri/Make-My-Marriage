"use client";

import {
  ArchiveX,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Pencil,
  RefreshCw,
  Shirt,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import {
  DashboardCard,
  focusRing,
  primaryButton,
  textLink,
} from "@/features/dashboard/components/dashboard-card";
import { Dialog } from "@/features/members/components/dialog";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { formatInstant, type DateOnly } from "@/lib/dates";
import { EVENT_TYPE_LABELS } from "@/modules/events/event.constants";
import type { EventDto } from "@/modules/events/event.types";

import { useArchiveEvent, useEvent } from "../api";
import { EVENTS, EVENTS_ROUTES } from "../events-content";
import { eventSchedule, mapsSearchUrl } from "../format";
import { EventFormDialog } from "./event-form-dialog";

const DETAIL = EVENTS.detail;
const LONG_DATE: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };

const secondaryButton = cn(
  "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-sand bg-white px-5 text-label-md text-graphite hover:bg-sand disabled:opacity-60",
  focusRing,
);
const dangerButton = cn(
  secondaryButton,
  "border-transparent bg-destructive text-white hover:bg-destructive/90",
);

export interface EventDetailScreenProps {
  eventId: string;
  timeZone: string;
  weddingDate: DateOnly;
  /** Today in the wedding's time zone. */
  today: DateOnly;
}

/**
 * /app/events/[eventId] (PRD §9.5, API_DESIGN §31–33): when and where, dress
 * code and notes, with edit and archive. Archived events are read-only.
 */
export function EventDetailScreen({
  eventId,
  timeZone,
  weddingDate,
  today,
}: Readonly<EventDetailScreenProps>) {
  const event = useEvent(eventId);

  let body;
  if (event.data) {
    body = (
      <EventDetail event={event.data} timeZone={timeZone} weddingDate={weddingDate} today={today} />
    );
  } else if (event.isError) {
    const missing =
      event.error instanceof ApiError &&
      (event.error.code === "NOT_FOUND" || event.error.code === "VALIDATION_ERROR");
    body = missing ? (
      <div className="rounded-3xl border border-dashed border-sand bg-white px-5 py-10 text-center">
        <p className="font-serif text-title-lg text-graphite">{DETAIL.notFound.title}</p>
        <p className="mx-auto mt-1 max-w-sm text-body-md text-plum">
          {DETAIL.notFound.description}
        </p>
        <Link href={EVENTS_ROUTES.list} className={cn(primaryButton, "mt-5")}>
          {DETAIL.back}
        </Link>
      </div>
    ) : (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-destructive/20 bg-white p-5"
      >
        <p className="text-body-md text-destructive">{EVENTS.loadError.title}</p>
        <button type="button" onClick={() => void event.refetch()} className={secondaryButton}>
          <RefreshCw aria-hidden className={cn("size-4", event.isFetching && "animate-spin")} />
          {EVENTS.loadError.retry}
        </button>
      </div>
    );
  } else {
    body = <DetailSkeleton />;
  }

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4 md:gap-6">
      <Link href={EVENTS_ROUTES.list} className={cn(textLink, "self-start")}>
        <ArrowLeft aria-hidden className="size-4" />
        {DETAIL.back}
      </Link>
      {body}
    </div>
  );
}

function EventDetail({
  event,
  timeZone,
  weddingDate,
  today,
}: Readonly<{ event: EventDto; timeZone: string; weddingDate: DateOnly; today: DateOnly }>) {
  const router = useRouter();
  const archive = useArchiveEvent();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const archived = event.archivedAt !== null;
  const schedule = eventSchedule(event, timeZone);
  const mapsUrl = mapsSearchUrl(event);
  const typeLabel = event.type ? EVENT_TYPE_LABELS[event.type] : null;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow text-gold-deep uppercase">
            {typeLabel && typeLabel !== event.name ? typeLabel : DETAIL.eyebrow}
          </p>
          <h1 className="mt-1 font-serif text-headline-md break-words text-graphite md:text-headline-lg">
            {event.name}
          </h1>
        </div>
        {!archived && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setNotice(null);
                archive.reset();
                setConfirming(true);
              }}
              className={secondaryButton}
            >
              <ArchiveX aria-hidden className="size-4" />
              {DETAIL.archive}
            </button>
            <button
              type="button"
              onClick={() => {
                setNotice(null);
                setEditing(true);
              }}
              className={primaryButton}
            >
              <Pencil aria-hidden className="size-4" />
              {DETAIL.edit}
            </button>
          </div>
        )}
      </header>

      {archived && (
        <p role="status" className="rounded-2xl bg-sand p-4 text-body-md text-plum">
          {DETAIL.archivedBanner(formatInstant(event.archivedAt!, timeZone, LONG_DATE))}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-sand bg-white p-4 text-body-md text-graphite"
        >
          <CheckCircle2 aria-hidden className="size-5 shrink-0 text-gold-deep" />
          {notice}
        </p>
      )}

      <DashboardCard title={DETAIL.when}>
        <dl className="flex flex-col gap-4">
          <Fact icon={<CalendarDays aria-hidden />} label={EVENTS.form.fields.date.label}>
            {schedule.date}
          </Fact>
          <Fact icon={<Clock aria-hidden />} label={DETAIL.time}>
            {schedule.time}
          </Fact>
          <Fact icon={<MapPin aria-hidden />} label={EVENTS.form.fields.venueName.label}>
            {event.venueName || event.address ? (
              <>
                {event.venueName && <span className="block">{event.venueName}</span>}
                {event.address && (
                  <span className="block whitespace-pre-line text-plum">{event.address}</span>
                )}
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(textLink, "mt-1")}
                  >
                    {DETAIL.openInMaps}
                    <ExternalLink aria-hidden className="size-3.5" />
                  </a>
                )}
              </>
            ) : (
              <span className="text-plum">{DETAIL.noVenue}</span>
            )}
          </Fact>
          {event.dressCode && (
            <Fact icon={<Shirt aria-hidden />} label={EVENTS.dressCode}>
              <span className="text-plum">{EVENTS.dressCode}: </span>
              {event.dressCode}
            </Fact>
          )}
        </dl>
      </DashboardCard>

      {event.description && (
        <DashboardCard title={DETAIL.notes}>
          <p className="text-body-md break-words whitespace-pre-line text-graphite">
            {event.description}
          </p>
        </DashboardCard>
      )}

      {!archived && (
        <EventFormDialog
          open={editing}
          onClose={() => setEditing(false)}
          event={event}
          timeZone={timeZone}
          weddingDate={weddingDate}
          today={today}
          onSaved={(saved) => {
            setEditing(false);
            setNotice(EVENTS.form.updated(saved.name));
          }}
        />
      )}

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={DETAIL.confirmArchive.title(event.name)}
        description={DETAIL.confirmArchive.description}
      >
        {archive.isError && (
          <p role="alert" className="mb-4 text-body-md text-destructive">
            {DETAIL.confirmArchive.error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2 md:flex md:justify-end">
          <button type="button" onClick={() => setConfirming(false)} className={secondaryButton}>
            {DETAIL.confirmArchive.cancel}
          </button>
          <button
            type="button"
            disabled={archive.isPending}
            aria-busy={archive.isPending || undefined}
            onClick={() =>
              archive.mutate(event.id, {
                onSuccess: () => router.push(EVENTS_ROUTES.list),
              })
            }
            className={dangerButton}
          >
            {DETAIL.confirmArchive.confirm}
          </button>
        </div>
      </Dialog>
    </>
  );
}

function Fact({
  icon,
  label,
  children,
}: Readonly<{ icon: ReactNode; label: string; children: ReactNode }>) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-gold-deep [&_svg]:size-5">{icon}</span>
      <div className="min-w-0 flex-1">
        <dt className="sr-only">{label}</dt>
        <dd className="text-body-lg break-words text-graphite">{children}</dd>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex animate-pulse flex-col gap-4">
      <div className="h-9 w-56 rounded bg-sand" />
      <div className="rounded-3xl border border-sand bg-white p-5 md:p-7">
        <div className="h-5 w-40 rounded bg-sand" />
        <div className="mt-6 space-y-4">
          <div className="h-4 w-64 rounded bg-sand" />
          <div className="h-4 w-48 rounded bg-sand" />
          <div className="h-4 w-56 rounded bg-sand" />
        </div>
      </div>
    </div>
  );
}
