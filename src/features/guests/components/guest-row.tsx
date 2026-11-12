import { ChevronRight, Pencil } from "lucide-react";
import Link from "next/link";

import { focusRing } from "@/components/ui/button-styles";
import { cn } from "@/lib/cn";
import { initialsOf } from "@/lib/couple";
import type { RsvpStatus } from "@/modules/guests/guest.constants";
import type { GuestDto } from "@/modules/guests/guest.types";

import { GUESTS, GUESTS_ROUTES, rsvpLabel } from "../guests-content";

const RSVP_PILL: Readonly<Record<RsvpStatus, string>> = {
  PENDING: "border-pending/40 bg-pending/10 text-graphite",
  ATTENDING: "border-success/40 bg-success/10 text-graphite",
  NOT_ATTENDING: "border-destructive/30 bg-destructive/5 text-destructive",
};

const RSVP_DOT: Readonly<Record<RsvpStatus, string>> = {
  PENDING: "bg-pending",
  ATTENDING: "bg-success",
  NOT_ATTENDING: "bg-destructive",
};

/** "Attending · 3", "Awaiting reply" or "Not attending", coloured like the dashboard's RSVP bar. */
export function RsvpPill({
  guest,
}: Readonly<{ guest: Pick<GuestDto, "rsvpStatus" | "attendingCount"> }>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-label-sm whitespace-nowrap",
        RSVP_PILL[guest.rsvpStatus],
      )}
    >
      <span aria-hidden className={cn("size-2 rounded-full", RSVP_DOT[guest.rsvpStatus])} />
      {rsvpLabel(guest.rsvpStatus, guest.attendingCount)}
    </span>
  );
}

/**
 * One guest: initials, name (opens their page), party size and invited
 * events, the RSVP and an edit button.
 */
export function GuestRow({
  guest,
  onEdit,
}: Readonly<{ guest: GuestDto; onEdit?: (guest: GuestDto) => void }>) {
  const contact = [guest.email, guest.phone].filter(Boolean).join(" · ");
  return (
    <div className="flex items-start gap-3 py-4">
      <span
        aria-hidden
        className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-sand text-label-md text-burgundy"
      >
        {initialsOf(guest.name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link
            href={GUESTS_ROUTES.guest(guest.id)}
            aria-label={GUESTS.open(guest.name)}
            className={cn(
              "tap-target inline-flex min-w-0 items-center gap-1 rounded text-label-md wrap-anywhere text-graphite hover:text-burgundy",
              focusRing,
            )}
          >
            <span className="min-w-0">{guest.name}</span>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-plum" />
          </Link>
          <RsvpPill guest={guest} />
        </div>
        <p className="mt-1 text-body-sm text-plum">{GUESTS.partySize(guest.maxGuests)}</p>
        {/* One line, cut short with the full text on hover, so a long email can't take three lines. */}
        {contact && (
          <p title={contact} className="truncate text-body-sm text-plum">
            {contact}
          </p>
        )}
        {guest.invitedEvents.length > 0 ? (
          <ul aria-label={GUESTS.form.fields.events.label} className="mt-2 flex flex-wrap gap-1.5">
            {guest.invitedEvents.map((event) => (
              <li
                key={event.id}
                title={event.name}
                className={cn(
                  "max-w-full truncate rounded-md border border-sand px-2 py-0.5 text-body-sm",
                  event.archivedAt ? "text-plum line-through" : "text-graphite",
                )}
              >
                {event.archivedAt ? GUESTS.archivedEvent(event.name) : event.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-body-sm text-plum italic">{GUESTS.noEvents}</p>
        )}
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={() => onEdit(guest)}
          aria-label={GUESTS.edit(guest.name)}
          className={cn(
            "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-plum hover:bg-sand hover:text-burgundy",
            focusRing,
          )}
        >
          <Pencil aria-hidden className="size-4" />
        </button>
      )}
    </div>
  );
}
