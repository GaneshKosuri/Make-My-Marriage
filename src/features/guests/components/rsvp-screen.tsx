"use client";

import { RefreshCw, UserPlus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { focusRing, primaryButton, secondaryButton } from "@/components/ui/button-styles";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { cn } from "@/lib/cn";
import { RSVP_STATUSES, type RsvpStatus } from "@/modules/guests/guest.constants";
import type { RsvpSummaryDto } from "@/modules/guests/guest.types";

import { useGuests, useRsvpSummary } from "../api";
import { GUESTS, GUESTS_ROUTES, RSVP_LABELS } from "../guests-content";
import { GuestRow } from "./guest-row";

const COPY = GUESTS.rsvp;
const PAGE_SIZE = 20;
/** Who needs attention first. */
const TAB_ORDER: readonly RsvpStatus[] = ["PENDING", "ATTENDING", "NOT_ATTENDING"];

const readStatus = (value: string | null): RsvpStatus =>
  RSVP_STATUSES.includes(value as RsvpStatus) ? (value as RsvpStatus) : "PENDING";

/**
 * /app/guests/rsvp (PRD §9.11, §9.13; API_DESIGN §39, §52): replies at a
 * glance (invitations and the people coming are different counts), then the
 * guests awaiting a reply, attending or not attending. `?status=` picks the list.
 */
export function RsvpScreen() {
  const searchParams = useSearchParams();
  const urlStatus = readStatus(searchParams.get("status"));
  const [status, setStatus] = useState<RsvpStatus>(urlStatus);
  const [lastUrlStatus, setLastUrlStatus] = useState(urlStatus);
  if (urlStatus !== lastUrlStatus) {
    setLastUrlStatus(urlStatus);
    setStatus(urlStatus);
  }
  const [page, setPage] = useState(1);
  const summary = useRsvpSummary();

  const choose = (next: RsvpStatus) => {
    setStatus(next);
    setPage(1);
    window.history.replaceState(null, "", GUESTS_ROUTES.rsvpFor(next));
  };

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4 md:gap-6">
      <header>
        <p className="text-eyebrow text-gold-deep uppercase">{COPY.eyebrow}</p>
        <h1 className="mt-1 font-serif text-headline-md text-graphite md:text-headline-lg">
          {COPY.title}
        </h1>
        <p className="mt-1 text-body-md text-plum">{COPY.description}</p>
      </header>

      {summary.data ? (
        summary.data.totalGuests === 0 ? (
          <div className="rounded-3xl border border-dashed border-sand bg-white px-5 py-10 text-center">
            <UserPlus aria-hidden className="mx-auto size-8 text-gold-deep" />
            <p className="mt-3 font-serif text-title-lg text-graphite">{COPY.noGuests.title}</p>
            <p className="mx-auto mt-1 max-w-sm text-body-md text-plum">
              {COPY.noGuests.description}
            </p>
            <Link href={GUESTS_ROUTES.add} className={cn(primaryButton, "mt-5")}>
              {COPY.noGuests.action}
            </Link>
          </div>
        ) : (
          <>
            <Stats summary={summary.data} />
            <div
              role="group"
              aria-label={COPY.tabs.label}
              className="grid grid-cols-3 rounded-full bg-sand p-1 sm:inline-grid sm:self-start"
            >
              {TAB_ORDER.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={status === value}
                  onClick={() => choose(value)}
                  className={cn(
                    "h-11 min-w-0 rounded-full px-2 text-label-md leading-tight transition-colors sm:px-4",
                    focusRing,
                    status === value
                      ? "bg-white text-graphite shadow-sm"
                      : "text-plum hover:text-graphite",
                  )}
                >
                  {RSVP_LABELS[value]}
                </button>
              ))}
            </div>
            <StatusList status={status} page={page} onPage={setPage} />
            {status === "PENDING" && <p className="text-body-sm text-plum">{COPY.remindersSoon}</p>}
          </>
        )
      ) : summary.isError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-destructive/20 bg-white p-5"
        >
          <p className="text-body-md text-destructive">{GUESTS.loadError.title}</p>
          <button type="button" onClick={() => void summary.refetch()} className={secondaryButton}>
            <RefreshCw aria-hidden className={cn("size-4", summary.isFetching && "animate-spin")} />
            {GUESTS.loadError.retry}
          </button>
        </div>
      ) : (
        <ListSkeleton rows={3} />
      )}
    </div>
  );
}

/** People coming leads; then invitations by reply. */
function Stats({ summary }: Readonly<{ summary: RsvpSummaryDto }>) {
  const stats = COPY.stats;
  const tiles = [
    { label: stats.attending, value: summary.attendingInvitations, dot: "bg-success" },
    { label: stats.pending, value: summary.pendingInvitations, dot: "bg-pending" },
    { label: stats.notAttending, value: summary.notAttendingInvitations, dot: "bg-destructive" },
  ];
  return (
    <section
      aria-label={COPY.title}
      className="grid grid-cols-1 gap-4 rounded-3xl border border-sand bg-white p-5 shadow-sm md:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-center lg:gap-8"
    >
      <div className="min-w-0">
        <p className="text-body-sm text-plum">{stats.peopleComing}</p>
        <p className="font-serif text-headline-lg text-graphite tabular-nums">
          {summary.totalPeopleAttending}
        </p>
        <p className="text-body-sm text-plum">{stats.invitations(summary.totalGuests)}</p>
      </div>
      {/* Compact rows on phones, three tiles from 400 px. */}
      <dl className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-3 min-[400px]:gap-3">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-sand bg-ivory px-4 py-3 min-[400px]:block min-[400px]:p-4"
          >
            <dt className="flex items-center gap-2 text-body-sm text-plum">
              <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", tile.dot)} />
              {tile.label}
            </dt>
            <dd className="flex items-baseline gap-1.5 min-[400px]:mt-1">
              <span className="font-serif text-title-lg text-graphite tabular-nums min-[400px]:text-headline-sm">
                {tile.value}
              </span>
              <span className="text-body-sm text-plum">{stats.unit(tile.value)}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function StatusList({
  status,
  page,
  onPage,
}: Readonly<{ status: RsvpStatus; page: number; onPage: (page: number) => void }>) {
  const guests = useGuests({ rsvpStatus: status, page, limit: PAGE_SIZE });

  // A page that emptied (replies moved guests to another list) moves back.
  const lastPage = guests.data?.pagination.totalPages ?? 0;
  const pastTheEnd =
    Boolean(guests.data) && !guests.isPlaceholderData && page > Math.max(lastPage, 1);
  useEffect(() => {
    if (pastTheEnd) onPage(Math.max(lastPage, 1));
  }, [pastTheEnd, lastPage, onPage]);

  if (guests.isError) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-destructive/20 bg-white p-5"
      >
        <p className="text-body-md text-destructive">{GUESTS.loadError.title}</p>
        <button type="button" onClick={() => void guests.refetch()} className={secondaryButton}>
          <RefreshCw aria-hidden className={cn("size-4", guests.isFetching && "animate-spin")} />
          {GUESTS.loadError.retry}
        </button>
      </div>
    );
  }
  if (!guests.data) return <ListSkeleton rows={3} />;

  const { data, pagination } = guests.data;
  if (pagination.total === 0) {
    return (
      <p className="rounded-3xl border border-dashed border-sand bg-white px-5 py-8 text-center text-body-md text-plum">
        {COPY.empty[status]}
      </p>
    );
  }
  const from = (pagination.page - 1) * pagination.limit + 1;
  const to = from + data.length - 1;
  return (
    <section
      aria-label={RSVP_LABELS[status]}
      className="rounded-3xl border border-sand bg-white px-5 pt-1 pb-5 shadow-sm md:px-7 md:pb-7"
    >
      <ul className="divide-y divide-sand">
        {data.map((guest) => (
          <li key={guest.id}>
            <GuestRow guest={guest} />
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-sand pt-4">
        <p className="text-body-sm text-plum">{GUESTS.count(from, to, pagination.total)}</p>
        {pagination.totalPages > 1 && (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => onPage(pagination.page - 1)}
              className={secondaryButton}
            >
              {GUESTS.previous}
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPage(pagination.page + 1)}
              className={secondaryButton}
            >
              {GUESTS.next}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
