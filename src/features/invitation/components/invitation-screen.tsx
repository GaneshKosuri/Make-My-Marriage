"use client";

import { CalendarDays, Clock, ExternalLink, MapPin, Minus, Plus, Shirt } from "lucide-react";
import { useState, type ReactNode } from "react";

import { focusRing, primaryButton, secondaryButton } from "@/components/ui/button-styles";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { formatDateOnly } from "@/lib/dates";
import { eventDateTile, eventSchedule, mapsSearchUrl } from "@/lib/schedule";
import type { PublicEventDto } from "@/modules/events/event.types";
import type { PublicInvitationDto, SubmitRsvpInput } from "@/modules/guests/guest.types";

import { usePublicInvitation, useRefreshInvitation, useSubmitRsvp } from "../api";
import { INVITATION } from "../invitation-content";

const COPY = INVITATION.rsvp;

/**
 * Intl output can differ between Node and the browser only in its spaces
 * (narrow no-break space before AM/PM): render plain spaces on both, so the
 * server's HTML hydrates as is.
 */
const plain = (text: string) => text.replace(/[  ]/g, " ");

/** The couple by name, groom first, as on every other page (decided 2026-10-10). */
const coupleOf = (wedding: PublicInvitationDto["wedding"]) =>
  `${wedding.groomName} & ${wedding.brideName}`;

/**
 * A guest's own invitation (PRD §9.10–9.11): the couple, their welcome, only
 * the events this guest is invited to, and the RSVP for the whole party. No
 * account; the reply can be changed later through the same link.
 */
export function InvitationScreen({
  token,
  initial,
}: Readonly<{ token: string; initial: PublicInvitationDto }>) {
  const { data } = usePublicInvitation(token, initial);
  const { guest, wedding, events } = data;
  const couple = coupleOf(wedding);
  const date = plain(
    formatDateOnly(wedding.weddingDate, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  );

  return (
    <article className="flex flex-col gap-5">
      <header className="relative overflow-hidden rounded-[28px] bg-burgundy px-6 py-10 text-center text-ivory shadow-lg">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-3 rounded-[22px] border border-gold/40"
        />
        <p className="text-eyebrow text-gold uppercase">{INVITATION.eyebrow}</p>
        <h1 className="mt-3 font-serif text-headline-lg wrap-anywhere">{couple}</h1>
        {wedding.title && wedding.title !== couple && (
          <p className="mt-1 font-serif text-title-lg wrap-anywhere text-ivory/90">
            {wedding.title}
          </p>
        )}
        <p className="mt-4 text-body-lg text-ivory/90">{date}</p>
        {wedding.location && (
          <p className="text-body-md wrap-anywhere text-ivory/80">{wedding.location}</p>
        )}
      </header>

      <section className="rounded-3xl border border-sand bg-white p-6 text-center shadow-sm">
        <p className="font-serif text-title-lg wrap-anywhere text-graphite">
          {INVITATION.dear(guest.name)}
        </p>
        <p className="mt-2 text-body-lg text-graphite">{INVITATION.welcome(couple)}</p>
        <p className="mt-2 text-body-md text-plum">{INVITATION.partySize(guest.maxGuests)}</p>
      </section>

      <section aria-labelledby="invitation-events" className="flex flex-col gap-3">
        <h2 id="invitation-events" className="px-1 font-serif text-headline-sm text-graphite">
          {INVITATION.events.title(events.length)}
        </h2>
        {events.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-sand bg-white p-5 text-body-md text-plum">
            {INVITATION.events.none}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {events.map((event, index) => (
              <li key={`${event.name}-${event.startsAt}-${index}`}>
                <EventCard event={event} timeZone={wedding.timeZone} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <RsvpCard token={token} invitation={data} />
    </article>
  );
}

function EventCard({ event, timeZone }: Readonly<{ event: PublicEventDto; timeZone: string }>) {
  const tile = eventDateTile(event.startsAt, timeZone);
  const schedule = eventSchedule(event, timeZone);
  const maps = mapsSearchUrl(event);
  return (
    <div className="flex gap-4 rounded-3xl border border-sand bg-white p-5 shadow-sm">
      <div
        aria-hidden
        className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-ivory text-burgundy"
      >
        <span className="text-eyebrow uppercase">{plain(tile.month)}</span>
        <span className="font-serif text-headline-sm leading-none">{plain(tile.day)}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3 className="font-serif text-title-lg wrap-anywhere text-graphite">{event.name}</h3>
        <Line icon={<CalendarDays aria-hidden />}>{plain(schedule.date)}</Line>
        <Line icon={<Clock aria-hidden />}>{plain(schedule.time)}</Line>
        {(event.venueName || event.address) && (
          <Line icon={<MapPin aria-hidden />}>
            {event.venueName && <span className="block text-graphite">{event.venueName}</span>}
            {event.address && <span className="block whitespace-pre-line">{event.address}</span>}
            {maps && (
              <a
                href={maps}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "tap-target mt-1 inline-flex items-center gap-1 rounded font-semibold text-burgundy underline-offset-4 hover:underline",
                  focusRing,
                )}
              >
                {INVITATION.events.maps}
                <ExternalLink aria-hidden className="size-3.5" />
              </a>
            )}
          </Line>
        )}
        {event.dressCode && (
          <Line icon={<Shirt aria-hidden />}>
            <span className="text-plum">{INVITATION.events.dressCode}: </span>
            {event.dressCode}
          </Line>
        )}
        {event.description && (
          <p className="mt-1 text-body-md wrap-anywhere whitespace-pre-line text-graphite">
            {event.description}
          </p>
        )}
      </div>
    </div>
  );
}

function Line({ icon, children }: Readonly<{ icon: ReactNode; children: ReactNode }>) {
  return (
    <div className="flex items-start gap-2 text-body-md text-plum">
      <span className="mt-0.5 shrink-0 text-gold-deep [&_svg]:size-4">{icon}</span>
      <div className="min-w-0 wrap-anywhere">{children}</div>
    </div>
  );
}

type Draft = { status: SubmitRsvpInput["status"] | null; count: number };

/**
 * The RSVP for the whole party: yes or no, then how many people. A saved
 * reply shows as a confirmation with "Change reply". The draft survives
 * failures that can be retried.
 */
function RsvpCard({
  token,
  invitation,
}: Readonly<{ token: string; invitation: PublicInvitationDto }>) {
  const { guest } = invitation;
  const submit = useSubmitRsvp(token);
  const refresh = useRefreshInvitation(token);
  const replied = guest.rsvpStatus !== "PENDING";
  const [editing, setEditing] = useState(!replied);
  const [draft, setDraft] = useState<Draft>(() => ({
    status: replied ? (guest.rsvpStatus === "ATTENDING" ? "ATTENDING" : "NOT_ATTENDING") : null,
    count: Math.min(Math.max(guest.attendingCount ?? 1, 1), guest.maxGuests),
  }));
  const [problem, setProblem] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  // A smaller party size arriving from the organiser keeps the draft within it.
  const count = Math.min(draft.count, guest.maxGuests);

  const send = () => {
    setProblem(null);
    if (!draft.status) {
      setProblem(COPY.chooseAttending);
      return;
    }
    const body: SubmitRsvpInput =
      draft.status === "ATTENDING"
        ? { status: "ATTENDING", attendingCount: count }
        : { status: "NOT_ATTENDING", attendingCount: 0 };
    submit.mutate(body, {
      onSuccess: () => {
        setEditing(false);
        setJustSaved(true);
      },
      onError: (error) => {
        const code = error instanceof ApiError ? error.code : null;
        if (code === "GUEST_LIMIT_EXCEEDED" || code === "PARTY_SIZE_CHANGED") {
          void refresh();
          setProblem(COPY.errors.partySize);
        } else if (code === "CONFLICT") {
          void refresh();
          setProblem(COPY.errors.conflict);
        } else if (code === "RATE_LIMITED") {
          setProblem(COPY.errors.rateLimited);
        } else if (code === "NOT_FOUND") {
          setProblem(COPY.errors.gone);
        } else {
          setProblem(COPY.errors.network);
        }
      },
    });
  };

  return (
    <section
      aria-labelledby="invitation-rsvp"
      className="rounded-3xl border-2 border-burgundy/15 bg-white p-6 shadow-sm"
    >
      <h2 id="invitation-rsvp" className="font-serif text-headline-sm text-graphite">
        {COPY.title}
      </h2>

      {!editing && replied ? (
        <div className="mt-3 flex flex-col items-start gap-3">
          <p role="status" className="text-body-lg text-graphite">
            {justSaved && <span className="block font-semibold">{COPY.thanks}</span>}
            {guest.rsvpStatus === "ATTENDING"
              ? COPY.coming(guest.attendingCount ?? 1)
              : COPY.notComing}
          </p>
          <p className="text-body-md text-plum">{COPY.canChange}</p>
          <button
            type="button"
            onClick={() => {
              setJustSaved(false);
              setProblem(null);
              setEditing(true);
            }}
            className={secondaryButton}
          >
            {COPY.change}
          </button>
        </div>
      ) : (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
          className="mt-3 flex flex-col gap-5"
        >
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-label-md text-graphite">{COPY.attendingQuestion}</legend>
            <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
              {(
                [
                  ["ATTENDING", COPY.yes],
                  ["NOT_ATTENDING", COPY.no],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="attending"
                    value={value}
                    checked={draft.status === value}
                    onChange={() => setDraft((current) => ({ ...current, status: value }))}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      "flex min-h-12 items-center justify-center rounded-full border border-sand bg-white px-4 text-center text-label-md text-graphite hover:bg-ivory",
                      "peer-checked:border-burgundy peer-checked:bg-burgundy peer-checked:text-ivory",
                      "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-burgundy",
                    )}
                  >
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {draft.status === "ATTENDING" && (
            <PartyCount
              value={count}
              max={guest.maxGuests}
              onChange={(next) => setDraft((current) => ({ ...current, count: next }))}
            />
          )}

          {problem && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/5 p-3 text-body-md text-destructive"
            >
              {problem}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 min-[400px]:flex-row">
            {replied && (
              <button
                type="button"
                onClick={() => {
                  setProblem(null);
                  setEditing(false);
                }}
                className={secondaryButton}
              >
                {COPY.cancel}
              </button>
            )}
            <button
              type="submit"
              disabled={submit.isPending}
              aria-busy={submit.isPending || undefined}
              className={cn(primaryButton, "min-[400px]:flex-1")}
            >
              {submit.isPending ? COPY.sending : replied ? COPY.update : COPY.send}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

/**
 * How many people are coming, including the guest: one tap per number for a
 * family (up to 10), a stepper for larger groups.
 */
function PartyCount({
  value,
  max,
  onChange,
}: Readonly<{ value: number; max: number; onChange: (value: number) => void }>) {
  if (max === 1) return null;
  if (max <= 10) {
    return (
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-label-md text-graphite">{COPY.countQuestion}</legend>
        <p className="text-body-sm text-plum">{COPY.countHint(max)}</p>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: max }, (_, index) => index + 1).map((option) => (
            <label key={option} className="cursor-pointer">
              <input
                type="radio"
                name="attendingCount"
                value={option}
                checked={value === option}
                onChange={() => onChange(option)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "flex size-12 items-center justify-center rounded-full border border-sand bg-white text-title-md text-graphite tabular-nums hover:bg-ivory",
                  "peer-checked:border-burgundy peer-checked:bg-burgundy peer-checked:text-ivory",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-burgundy",
                )}
              >
                {option}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  const stepButton = cn(
    "inline-flex size-12 items-center justify-center rounded-full border border-sand bg-white text-graphite hover:bg-ivory disabled:opacity-40",
    focusRing,
  );
  return (
    <div className="flex flex-col gap-2">
      <p id="party-count-label" className="text-label-md text-graphite">
        {COPY.countQuestion}
      </p>
      <p className="text-body-sm text-plum">{COPY.countHint(max)}</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={COPY.decrease}
          disabled={value <= 1}
          onClick={() => onChange(value - 1)}
          className={stepButton}
        >
          <Minus aria-hidden className="size-4" />
        </button>
        <output
          aria-labelledby="party-count-label"
          aria-live="polite"
          className="min-w-12 text-center font-serif text-headline-sm text-graphite tabular-nums"
        >
          {value}
        </output>
        <button
          type="button"
          aria-label={COPY.increase}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className={stepButton}
        >
          <Plus aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );
}
