"use client";

import { BellRing, CheckCircle2, Mail, Pencil } from "lucide-react";
import { useState } from "react";

import { primaryButton, secondaryButton } from "@/components/ui/button-styles";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/schedule";
import type { GuestDto } from "@/modules/guests/guest.types";

import { useEmailGuest } from "../api";
import { GUESTS } from "../guests-content";

const COPY = GUESTS.email;

/**
 * Email this guest their invitation, again if needed, and RSVP reminders
 * while they haven't replied (PRD §9.12–9.13; API_DESIGN §46, §48). Sent at
 * once; the dates sent show here.
 */
export function EmailInvitation({
  guest,
  timeZone,
  onAddEmail,
}: Readonly<{ guest: GuestDto; timeZone: string; onAddEmail: () => void }>) {
  const email = useEmailGuest();
  const [done, setDone] = useState<string | null>(null);
  const when = (iso: string) => formatDateTime(iso, timeZone);
  const send = (kind: "invitation" | "reminder") => {
    setDone(null);
    email.mutate({ guestId: guest.id, kind }, { onSuccess: () => setDone(COPY.done[kind]) });
  };
  // The server's message is written for people ("Today's email sending limit is reached…").
  const problem =
    email.error instanceof ApiError &&
    (email.error.code === "EXTERNAL_SERVICE_ERROR" || email.error.code === "VALIDATION_ERROR")
      ? email.error.message
      : email.error
        ? COPY.error
        : null;

  return (
    <DashboardCard title={COPY.title}>
      {!guest.email ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-body-md text-plum">{COPY.noEmail}</p>
          <button type="button" onClick={onAddEmail} className={secondaryButton}>
            <Pencil aria-hidden className="size-4" />
            {COPY.addEmail}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-body-md text-plum">
            {guest.invitationSentAt ? COPY.sent(when(guest.invitationSentAt)) : COPY.notSent}
            {guest.lastReminderSentAt && (
              <span className="block">
                {COPY.reminded(guest.reminderCount, when(guest.lastReminderSentAt))}
              </span>
            )}
          </p>
          <div className="grid grid-cols-1 gap-2 min-[400px]:flex min-[400px]:flex-wrap">
            <button
              type="button"
              disabled={email.isPending}
              aria-busy={email.isPending || undefined}
              onClick={() => send("invitation")}
              className={guest.invitationSentAt ? secondaryButton : primaryButton}
            >
              <Mail aria-hidden className="size-4" />
              {email.isPending && email.variables?.kind === "invitation"
                ? COPY.sending
                : guest.invitationSentAt
                  ? COPY.resend
                  : COPY.send}
            </button>
            {guest.rsvpStatus === "PENDING" && guest.invitationSentAt && (
              <button
                type="button"
                disabled={email.isPending}
                aria-busy={email.isPending || undefined}
                onClick={() => send("reminder")}
                className={secondaryButton}
              >
                <BellRing aria-hidden className="size-4" />
                {email.isPending && email.variables?.kind === "reminder"
                  ? COPY.sending
                  : COPY.remind}
              </button>
            )}
          </div>
          {done && (
            <p role="status" className="flex items-center gap-2 text-body-md text-graphite">
              <CheckCircle2 aria-hidden className="size-5 shrink-0 text-gold-deep" />
              {done}
            </p>
          )}
          {problem && (
            <p role="alert" className="text-body-md text-destructive">
              {problem}
            </p>
          )}
        </div>
      )}
    </DashboardCard>
  );
}
