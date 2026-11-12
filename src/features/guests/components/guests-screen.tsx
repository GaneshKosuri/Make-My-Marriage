"use client";

import { CheckCircle2, Plus, RefreshCw, Search, SlidersHorizontal, Users, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useState, type ComponentProps } from "react";

import { focusRing, primaryButton, secondaryButton, textLink } from "@/components/ui/button-styles";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useEvents } from "@/features/events/api";
import { cn } from "@/lib/cn";
import { RSVP_STATUSES } from "@/modules/guests/guest.constants";
import type { GuestDto } from "@/modules/guests/guest.types";

import { useGuests, useRsvpSummary, type GuestsQuery } from "../api";
import { GUESTS, GUESTS_ROUTES, RSVP_LABELS } from "../guests-content";
import { guestsUrlFor, readGuestsUrl, type GuestFilters } from "../url-state";
import { GuestFormDialog } from "./guest-form-dialog";
import { GuestRow } from "./guest-row";

const PAGE_SIZE = 20;
/** Wait this long after the last keystroke before searching. */
const SEARCH_DELAY_MS = 300;

export interface GuestsScreenProps {
  timeZone: string;
}

function toQuery(filters: GuestFilters, page: number): GuestsQuery {
  const { invitationSent, ...rest } = filters;
  return {
    page,
    limit: PAGE_SIZE,
    ...rest,
    ...(invitationSent && { invitationSent: invitationSent === "true" }),
  };
}

/** What the form is showing: a new guest or an existing one. */
type Editing = { kind: "new" } | { kind: "edit"; guest: GuestDto } | null;

function useGuestsUrl() {
  const searchParams = useSearchParams();
  return { search: searchParams.toString(), ...readGuestsUrl(Object.fromEntries(searchParams)) };
}

/**
 * /app/guests (PRD §9.7–9.8, API_DESIGN §39–43): the guest list with search,
 * RSVP, event and invitation filters (kept in the address), pages of 20, and
 * the add/edit sheet. One guest is one invitation.
 */
export function GuestsScreen({ timeZone }: Readonly<GuestsScreenProps>) {
  const url = useGuestsUrl();
  const [filters, setFilters] = useState<GuestFilters>(url.filters);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Editing>(url.startAdding ? { kind: "new" } : null);
  const [notice, setNotice] = useState<string | null>(null);
  const guests = useGuests(toQuery(filters, page));

  // Links into the screen while it stays mounted (the dashboard, the "+" sheet's
  // ?new=1) arrive as a new address: follow it unless this screen wrote it.
  const [lastSearch, setLastSearch] = useState(url.search);
  if (url.search !== lastSearch) {
    setLastSearch(url.search);
    if (
      guestsUrlFor(GUESTS_ROUTES.list, url.filters) !== guestsUrlFor(GUESTS_ROUTES.list, filters)
    ) {
      setFilters(url.filters);
      setPage(1);
      setNotice(null);
    }
    if (url.startAdding) setEditing({ kind: "new" });
  }
  // Then drop ?new=1, so a reload or Back doesn't open the form again.
  const { startAdding } = url;
  const cleanUrl = guestsUrlFor(GUESTS_ROUTES.list, url.filters);
  useEffect(() => {
    if (startAdding) window.history.replaceState(null, "", cleanUrl);
  }, [startAdding, cleanUrl]);

  // A page emptied by a delete moves back to the last page that still has guests.
  const lastPage = guests.data?.pagination.totalPages ?? 0;
  if (guests.data && !guests.isPlaceholderData && page > Math.max(lastPage, 1)) {
    setPage(Math.max(lastPage, 1));
  }

  const show = (next: GuestFilters) => {
    setFilters(next);
    setPage(1);
    setNotice(null);
    window.history.replaceState(null, "", guestsUrlFor(GUESTS_ROUTES.list, next));
  };

  // After a refetch the form follows the latest copy of the guest it is editing.
  const editingGuest =
    editing?.kind === "edit"
      ? (guests.data?.data.find((guest) => guest.id === editing.guest.id) ?? editing.guest)
      : undefined;
  const filtered = Object.values(filters).some(Boolean);
  const add = () => {
    setNotice(null);
    setEditing({ kind: "new" });
  };

  let body;
  if (guests.data) {
    body = (
      <GuestList
        guests={guests.data.data}
        pagination={guests.data.pagination}
        filtered={filtered}
        onPage={setPage}
        onEdit={(guest) => {
          setNotice(null);
          setEditing({ kind: "edit", guest });
        }}
        onAdd={add}
        onClearFilters={() => show({})}
      />
    );
  } else if (guests.isError) {
    body = (
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
  } else {
    body = <ListSkeleton rows={4} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4 md:gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow text-gold-deep uppercase">{GUESTS.eyebrow}</p>
          <h1 className="mt-1 font-serif text-headline-md text-graphite md:text-headline-lg">
            {GUESTS.title}
          </h1>
          <p className="mt-1 text-body-md text-plum">{GUESTS.description}</p>
        </div>
        <button type="button" onClick={add} className={primaryButton}>
          <Plus aria-hidden className="size-4" />
          {GUESTS.add}
        </button>
      </header>

      <SummaryStrip />

      <FilterBar filters={filters} onChange={show} />

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

      <GuestFormDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        guest={editingGuest}
        timeZone={timeZone}
        onSaved={(guest) => {
          setNotice(
            editing?.kind === "edit"
              ? GUESTS.form.updated(guest.name)
              : GUESTS.form.added(guest.name),
          );
          setEditing(null);
        }}
        onDeleted={(guest) => {
          setNotice(GUESTS.form.deleted(guest.name));
          setEditing(null);
        }}
      />
    </div>
  );
}

/** Invitations, people coming and replies still awaited, with a link to the RSVP page. */
function SummaryStrip() {
  const summary = useRsvpSummary();
  const copy = GUESTS.summary;
  if (!summary.data || summary.data.totalGuests === 0) return null;
  const stats = [
    { label: copy.invitations, value: summary.data.totalGuests },
    { label: copy.attending, value: summary.data.totalPeopleAttending },
    { label: copy.pending, value: summary.data.pendingInvitations },
  ];
  return (
    <section
      aria-label={copy.label}
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-3xl border border-sand bg-white px-5 py-4 shadow-sm md:px-7"
    >
      <dl className="grid w-full min-w-0 grid-cols-3 gap-3 sm:flex sm:w-auto sm:flex-1 sm:gap-8">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0">
            <dt className="text-[12px] leading-4 text-plum sm:text-body-sm">{stat.label}</dt>
            <dd className="font-serif text-headline-sm text-graphite tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <Link href={GUESTS_ROUTES.rsvp} className={textLink}>
        {copy.rsvpLink}
      </Link>
    </section>
  );
}

function FilterBar({
  filters,
  onChange,
}: Readonly<{ filters: GuestFilters; onChange: (filters: GuestFilters) => void }>) {
  const events = useEvents(true);
  const copy = GUESTS.filters;
  const searchId = useId();
  const filtersId = useId();
  const activeFilters = [filters.rsvpStatus, filters.eventId, filters.invitationSent].filter(
    Boolean,
  ).length;
  // Phones show the search and a "Filters" button; the selects open below it.
  const [open, setOpen] = useState(activeFilters > 0);
  const set = (key: keyof GuestFilters, value: string) =>
    onChange({ ...filters, [key]: value || undefined });

  // The box shows what is typed at once; the list follows a moment later.
  const [typed, setTyped] = useState(filters.search ?? "");
  const [lastSearch, setLastSearch] = useState(filters.search);
  if (filters.search !== lastSearch) {
    setLastSearch(filters.search);
    if ((filters.search ?? "") !== typed.trim()) setTyped(filters.search ?? "");
  }
  useEffect(() => {
    const next = typed.trim() || undefined;
    if (next === filters.search) return;
    const timer = window.setTimeout(() => onChange({ ...filters, search: next }), SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [typed, filters, onChange]);

  return (
    <fieldset className="flex flex-col gap-3 rounded-3xl border border-sand bg-white p-4 md:p-5">
      <legend className="sr-only">{copy.label}</legend>
      <div className="relative">
        <label htmlFor={searchId} className="sr-only">
          {GUESTS.search.label}
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-plum"
        />
        <input
          id={searchId}
          type="search"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder={GUESTS.search.placeholder}
          autoComplete="off"
          className={cn(
            "h-11 w-full rounded-xl border border-sand bg-ivory pr-11 pl-10 text-[16px] text-graphite placeholder:text-plum/70 sm:text-body-md",
            "focus-visible:border-burgundy focus-visible:ring-[3px] focus-visible:ring-burgundy/10 focus-visible:outline-none",
            "[&::-webkit-search-cancel-button]:hidden",
          )}
        />
        {typed && (
          <button
            type="button"
            onClick={() => setTyped("")}
            aria-label={`Clear ${GUESTS.search.label.toLowerCase()}`}
            className={cn(
              "absolute top-1/2 right-0.5 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-plum hover:text-burgundy",
              focusRing,
            )}
          >
            <X aria-hidden className="size-4" />
          </button>
        )}
      </div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={filtersId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex h-11 items-center gap-2 self-start rounded-full px-1 text-label-md text-burgundy md:hidden",
          focusRing,
        )}
      >
        <SlidersHorizontal aria-hidden className="size-4" />
        {copy.toggle(activeFilters)}
      </button>
      {/* One column on the narrowest phones, as on the Tasks filters (QA M13). */}
      <div
        id={filtersId}
        className={cn(
          "grid-cols-1 gap-3 min-[360px]:grid-cols-2 md:grid md:grid-cols-3",
          open ? "grid" : "hidden",
        )}
      >
        <FilterSelect
          label={copy.rsvp}
          value={filters.rsvpStatus ?? ""}
          onChange={(event) => set("rsvpStatus", event.target.value)}
        >
          <option value="">{copy.anyRsvp}</option>
          {RSVP_STATUSES.map((status) => (
            <option key={status} value={status}>
              {RSVP_LABELS[status]}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label={copy.event}
          value={filters.eventId ?? ""}
          onChange={(event) => set("eventId", event.target.value)}
        >
          <option value="">{copy.anyEvent}</option>
          {events.data?.map((event) => (
            <option key={event.id} value={event.id}>
              {event.archivedAt ? GUESTS.archivedEvent(event.name) : event.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label={copy.invitation}
          value={filters.invitationSent ?? ""}
          onChange={(event) => set("invitationSent", event.target.value)}
        >
          <option value="">{copy.anyInvitation}</option>
          <option value="true">{copy.sent}</option>
          <option value="false">{copy.notSent}</option>
        </FilterSelect>
      </div>
      {Object.values(filters).some(Boolean) && (
        <button
          type="button"
          onClick={() => {
            setTyped("");
            onChange({});
          }}
          className={cn(
            "tap-target self-start rounded text-label-md text-burgundy underline-offset-4 hover:underline",
            focusRing,
          )}
        >
          {copy.clear}
        </button>
      )}
    </fieldset>
  );
}

function FilterSelect({
  label,
  children,
  ...select
}: Readonly<{ label: string } & ComponentProps<"select">>) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-label-sm text-plum">
        {label}
      </label>
      <select
        id={id}
        className={cn(
          // 16 px on phones: iOS Safari zooms in on focus below that (QA M13).
          "h-11 w-full min-w-0 rounded-xl border border-sand bg-ivory px-2.5 text-[16px] text-graphite sm:text-body-md",
          "focus-visible:border-burgundy focus-visible:ring-[3px] focus-visible:ring-burgundy/10 focus-visible:outline-none",
        )}
        {...select}
      >
        {children}
      </select>
    </div>
  );
}

function GuestList({
  guests,
  pagination,
  filtered,
  onPage,
  onEdit,
  onAdd,
  onClearFilters,
}: Readonly<{
  guests: readonly GuestDto[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  filtered: boolean;
  onPage: (page: number) => void;
  onEdit: (guest: GuestDto) => void;
  onAdd: () => void;
  onClearFilters: () => void;
}>) {
  if (pagination.total === 0) {
    const empty = filtered ? GUESTS.noMatches : GUESTS.empty;
    return (
      <div className="rounded-3xl border border-dashed border-sand bg-white px-5 py-10 text-center">
        <Users aria-hidden className="mx-auto size-8 text-gold-deep" />
        <p className="mt-3 font-serif text-title-lg text-graphite">{empty.title}</p>
        <p className="mx-auto mt-1 max-w-sm text-body-md text-plum">{empty.description}</p>
        {filtered ? (
          <button type="button" onClick={onClearFilters} className={cn(secondaryButton, "mt-5")}>
            {GUESTS.filters.clear}
          </button>
        ) : (
          <button type="button" onClick={onAdd} className={cn(primaryButton, "mt-5")}>
            {GUESTS.empty.action}
          </button>
        )}
      </div>
    );
  }

  // A page past the end (its last guest just went): the screen is moving back a page.
  if (guests.length === 0) return <ListSkeleton rows={4} />;

  const from = (pagination.page - 1) * pagination.limit + 1;
  const to = from + guests.length - 1;
  return (
    <section
      aria-label={GUESTS.title}
      className="rounded-3xl border border-sand bg-white px-5 pt-1 pb-5 shadow-sm md:px-7 md:pb-7"
    >
      <ul className="divide-y divide-sand">
        {guests.map((guest) => (
          <li key={guest.id}>
            <GuestRow guest={guest} onEdit={onEdit} />
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
