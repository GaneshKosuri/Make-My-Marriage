"use client";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import {
  dangerButton,
  focusRing,
  primaryButton,
  secondaryButton,
  textLink,
} from "@/components/ui/button-styles";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { Dialog } from "@/components/ui/dialog";
import { EVENTS_ROUTES } from "@/features/events/events-content";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { formatInstant } from "@/lib/dates";
import { eventDateTile, eventTimeRange } from "@/lib/schedule";
import type { GuestDto } from "@/modules/guests/guest.types";

import { useDeleteGuest, useGuest } from "../api";
import { GUESTS, GUESTS_ROUTES } from "../guests-content";
import { GuestFormDialog } from "./guest-form-dialog";
import { RsvpPill } from "./guest-row";
import { EmailInvitation } from "./email-invitation";
import { InvitationShare } from "./invitation-share";

const DETAIL = GUESTS.detail;
const DAY: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
const TIME: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };

export interface GuestDetailScreenProps {
  guestId: string;
  timeZone: string;
  /** "Akshay & Princi", for the WhatsApp message. */
  coupleName: string;
}

/**
 * /app/guests/[guestId] (PRD §9.7–9.11, API_DESIGN §41–43): the guest's reply,
 * party size, invited events and contacts, with edit and delete.
 */
export function GuestDetailScreen({
  guestId,
  timeZone,
  coupleName,
}: Readonly<GuestDetailScreenProps>) {
  const guest = useGuest(guestId);

  let body;
  if (guest.data) {
    body = <GuestDetail guest={guest.data} timeZone={timeZone} coupleName={coupleName} />;
  } else if (guest.isError) {
    const missing =
      guest.error instanceof ApiError &&
      (guest.error.code === "NOT_FOUND" || guest.error.code === "VALIDATION_ERROR");
    body = missing ? (
      <div className="rounded-3xl border border-dashed border-sand bg-white px-5 py-10 text-center">
        <p className="font-serif text-title-lg text-graphite">{DETAIL.notFound.title}</p>
        <p className="mx-auto mt-1 max-w-sm text-body-md text-plum">
          {DETAIL.notFound.description}
        </p>
        <Link href={GUESTS_ROUTES.list} className={cn(primaryButton, "mt-5")}>
          {DETAIL.back}
        </Link>
      </div>
    ) : (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-destructive/20 bg-white p-5"
      >
        <p className="text-body-md text-destructive">{GUESTS.loadError.title}</p>
        <button type="button" onClick={() => void guest.refetch()} className={secondaryButton}>
          <RefreshCw aria-hidden className={cn("size-4", guest.isFetching && "animate-spin")} />
          {GUESTS.loadError.retry}
        </button>
      </div>
    );
  } else {
    body = <DetailSkeleton />;
  }

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4 md:gap-6">
      <Link href={GUESTS_ROUTES.list} className={cn(textLink, "self-start")}>
        <ArrowLeft aria-hidden className="size-4" />
        {DETAIL.back}
      </Link>
      {body}
    </div>
  );
}

function GuestDetail({
  guest,
  timeZone,
  coupleName,
}: Readonly<{ guest: GuestDto; timeZone: string; coupleName: string }>) {
  const router = useRouter();
  const remove = useDeleteGuest();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // "12 Nov 2026, 4:30 PM" in the wedding's time zone (clock times as in the designs).
  const when = (iso: string) =>
    `${formatInstant(iso, timeZone, DAY)}, ${formatInstant(iso, timeZone, TIME, "en-US")}`;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-eyebrow text-gold-deep uppercase">{DETAIL.eyebrow}</p>
          <h1 className="mt-1 font-serif text-headline-md wrap-anywhere text-graphite md:text-headline-lg">
            {guest.name}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setNotice(null);
              remove.reset();
              setConfirming(true);
            }}
            className={secondaryButton}
          >
            <Trash2 aria-hidden className="size-4" />
            {DETAIL.delete}
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

      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        <DashboardCard title={DETAIL.rsvp}>
          <div className="flex flex-col gap-3">
            <div>
              <RsvpPill guest={guest} />
            </div>
            <Fact icon={<Users aria-hidden />}>{DETAIL.partySize(guest.maxGuests)}</Fact>
            <p className="text-body-md text-plum">
              {guest.rsvpUpdatedAt ? DETAIL.rsvpUpdated(when(guest.rsvpUpdatedAt)) : DETAIL.noReply}
            </p>
          </div>
        </DashboardCard>

        <DashboardCard title={DETAIL.contact}>
          <div className="flex flex-col gap-3">
            {guest.email && (
              <Fact icon={<Mail aria-hidden />}>
                <a href={`mailto:${guest.email}`} className={cn(textLink, "wrap-anywhere")}>
                  {guest.email}
                </a>
              </Fact>
            )}
            {guest.phone && (
              <Fact icon={<Phone aria-hidden />}>
                <a href={`tel:${guest.phone.replace(/[^\d+]/g, "")}`} className={textLink}>
                  {guest.phone}
                </a>
              </Fact>
            )}
            {!guest.email && !guest.phone && (
              <p className="text-body-md text-plum">{DETAIL.noContact}</p>
            )}
          </div>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        <InvitationShare guestId={guest.id} guestName={guest.name} coupleName={coupleName} />
        <EmailInvitation
          guest={guest}
          timeZone={timeZone}
          onAddEmail={() => {
            setNotice(null);
            setEditing(true);
          }}
        />
      </div>

      <DashboardCard title={DETAIL.events}>
        {guest.invitedEvents.length === 0 ? (
          <p className="text-body-md text-plum">{DETAIL.noEventsInvited}</p>
        ) : (
          <ul className="divide-y divide-sand border-t border-sand">
            {guest.invitedEvents.map((event) => (
              <li key={event.id} className="flex items-start gap-3 py-3">
                <CalendarDays aria-hidden className="mt-0.5 size-5 shrink-0 text-gold-deep" />
                <div className="min-w-0">
                  <Link
                    href={EVENTS_ROUTES.event(event.id)}
                    className={cn(
                      "rounded text-label-md wrap-anywhere text-graphite hover:text-burgundy",
                      focusRing,
                      event.archivedAt && "text-plum line-through",
                    )}
                  >
                    {event.archivedAt ? GUESTS.archivedEvent(event.name) : event.name}
                  </Link>
                  <p className="text-body-sm text-plum">
                    {eventDateTile(event.startsAt, timeZone).label} ·{" "}
                    {eventTimeRange({ startsAt: event.startsAt, endsAt: null }, timeZone)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DashboardCard>

      {guest.notes && (
        <DashboardCard title={DETAIL.notes}>
          <p className="text-body-md wrap-anywhere whitespace-pre-line text-graphite">
            {guest.notes}
          </p>
        </DashboardCard>
      )}

      <GuestFormDialog
        open={editing}
        onClose={() => setEditing(false)}
        guest={guest}
        timeZone={timeZone}
        onSaved={(saved) => {
          setEditing(false);
          setNotice(GUESTS.form.updated(saved.name));
        }}
      />

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={DETAIL.confirmDelete.title(guest.name)}
        description={DETAIL.confirmDelete.description}
      >
        {remove.isError && (
          <p role="alert" className="mb-4 text-body-md text-destructive">
            {DETAIL.confirmDelete.error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
          <button type="button" onClick={() => setConfirming(false)} className={secondaryButton}>
            {DETAIL.confirmDelete.cancel}
          </button>
          <button
            type="button"
            disabled={remove.isPending}
            aria-busy={remove.isPending || undefined}
            onClick={() =>
              remove.mutate(guest.id, { onSuccess: () => router.push(GUESTS_ROUTES.list) })
            }
            className={dangerButton}
          >
            {DETAIL.confirmDelete.confirm}
          </button>
        </div>
      </Dialog>
    </>
  );
}

function Fact({ icon, children }: Readonly<{ icon: ReactNode; children: ReactNode }>) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0 text-gold-deep [&_svg]:size-5">{icon}</span>
      <div className="min-w-0 flex-1 text-body-lg text-graphite">{children}</div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex animate-pulse flex-col gap-4">
      <div className="h-9 w-56 max-w-full rounded bg-sand" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-40 rounded-3xl border border-sand bg-white" />
        <div className="h-40 rounded-3xl border border-sand bg-white" />
      </div>
    </div>
  );
}
