"use client";

import { AlertCircle, CheckCircle2, Mail, RefreshCw, X } from "lucide-react";
import { useState } from "react";

import { focusRing, primaryButton, secondaryButton } from "@/components/ui/button-styles";
import { Dialog } from "@/components/ui/dialog";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";

import { useEmailBatch, useEmailGuestsInBulk, useRetryFailedEmails } from "../api";
import { GUESTS } from "../guests-content";

const COPY = GUESTS.bulk;

/** The hourly limit on bulk sends: trying again at once won't help (QA P3-1). */
const isRateLimited = (error: unknown) =>
  error instanceof ApiError && error.code === "RATE_LIMITED";

/** Checks without any email going out before the panel says some are waiting. */
const STALLED_CHECKS = 10;

export type BulkEmailKind = "invitations" | "reminders";

/**
 * "Email 12 invitations" / "Remind 8 guests" (PRD §9.12–9.13; API_DESIGN
 * §47, §49): asks first, queues the emails, then shows them going out.
 * Hidden when there is no one to email and nothing in progress.
 */
export function BulkEmailButton({
  kind,
  count,
  onStarted,
}: Readonly<{ kind: BulkEmailKind; count: number; onStarted: (batchId: string) => void }>) {
  const copy = COPY[kind];
  const send = useEmailGuestsInBulk();
  const [confirming, setConfirming] = useState(false);
  // Everyone counted already had one of these on its way: nothing new was queued.
  const [alreadySending, setAlreadySending] = useState(false);
  const close = () => {
    setConfirming(false);
    setAlreadySending(false);
  };
  // The dialog stays up to say so even when the refreshed count hides the button.
  if (count === 0 && !confirming) return null;

  return (
    <>
      {count > 0 && (
        <button
          type="button"
          onClick={() => {
            send.reset();
            setAlreadySending(false);
            setConfirming(true);
          }}
          className={secondaryButton}
        >
          <Mail aria-hidden className="size-4" />
          {copy.button(count)}
        </button>
      )}
      <Dialog
        open={confirming}
        onClose={close}
        title={copy.title}
        description={alreadySending ? undefined : copy.description(count)}
      >
        {alreadySending ? (
          <>
            <p role="status" className="mb-4 text-body-md text-graphite">
              {copy.alreadySending}
            </p>
            <div className="flex flex-col gap-3 md:flex-row md:justify-end">
              <button type="button" onClick={close} className={secondaryButton}>
                {COPY.close}
              </button>
            </div>
          </>
        ) : (
          <>
            {send.isError && (
              <p role="alert" className="mb-4 text-body-md text-destructive">
                {isRateLimited(send.error) ? COPY.rateLimited : COPY.error}
              </p>
            )}
            <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
              <button type="button" onClick={close} className={secondaryButton}>
                {COPY.cancel}
              </button>
              <button
                type="button"
                disabled={send.isPending}
                aria-busy={send.isPending || undefined}
                onClick={() =>
                  send.mutate(
                    kind === "invitations"
                      ? { kind, body: { scope: "ALL_UNSENT" } }
                      : { kind, body: { scope: "ALL_PENDING_RSVP" } },
                    {
                      onSuccess: (result) => {
                        if (result.jobsCreated === 0) {
                          setAlreadySending(true);
                          return;
                        }
                        setConfirming(false);
                        onStarted(result.batchId);
                      },
                    },
                  )
                }
                className={primaryButton}
              >
                {send.isPending ? COPY.working : copy.confirm}
              </button>
            </div>
          </>
        )}
      </Dialog>
    </>
  );
}

/** A bulk send in progress or just finished, with "Try again" for any that failed. */
export function BulkEmailProgress({
  kind,
  batchId,
  onDismiss,
}: Readonly<{ kind: BulkEmailKind; batchId: string; onDismiss: () => void }>) {
  const copy = COPY[kind];
  // Counts consecutive checks in which nothing more was sent.
  const [stall, setStall] = useState({ sent: -1, checks: 0, at: 0 });
  const waiting = stall.checks >= STALLED_CHECKS;
  const batch = useEmailBatch(batchId, { waiting });
  const retry = useRetryFailedEmails();
  if (batch.data && batch.dataUpdatedAt !== stall.at) {
    setStall((last) => ({
      sent: batch.data.sent,
      checks: batch.data.sent === last.sent ? last.checks + 1 : 0,
      at: batch.dataUpdatedAt,
    }));
  }

  const status = batch.data;
  const total = status?.total ?? 0;
  const done = status?.completed ?? false;
  // A batch that can't be read (none queued, or a network problem) is no longer
  // checked; while offline, checks wait and resume once back online (QA P2-1).
  const lost = (batch.isError || batch.isPaused) && !done;
  const percent =
    total > 0 && status
      ? Math.round(((status.sent + status.failed + status.cancelled) / total) * 100)
      : 0;

  return (
    <section
      aria-label={copy.title}
      className="flex flex-col gap-3 rounded-3xl border border-sand bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <p role="status" className="flex items-center gap-2 text-body-md text-graphite">
          {lost ? (
            <AlertCircle aria-hidden className="size-5 shrink-0 text-destructive" />
          ) : done ? (
            <CheckCircle2 aria-hidden className="size-5 shrink-0 text-gold-deep" />
          ) : (
            <Mail aria-hidden className="size-5 shrink-0 text-gold-deep" />
          )}
          <span>
            {lost
              ? COPY.statusError
              : !status
                ? COPY.working
                : done
                  ? copy.done(status.sent)
                  : copy.progress(status.sent, total)}
          </span>
        </p>
        {(done || lost) && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={COPY.dismiss}
            className={cn(
              "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-plum hover:bg-sand",
              focusRing,
            )}
          >
            <X aria-hidden className="size-4" />
          </button>
        )}
      </div>
      {!done && !lost && (
        <div
          role="progressbar"
          aria-label={copy.title}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-2 overflow-hidden rounded-full bg-sand"
        >
          <div className="h-full bg-burgundy transition-[width]" style={{ width: `${percent}%` }} />
        </div>
      )}
      {status && !done && !lost && (
        <p className="text-body-sm text-plum">{waiting ? COPY.waiting : COPY.background}</p>
      )}
      {status && status.cancelled > 0 && (
        <p className="text-body-sm text-plum">{COPY.skipped(status.cancelled)}</p>
      )}
      {status && status.failed > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-body-sm text-destructive">{COPY.failed(status.failed)}</p>
          <button
            type="button"
            disabled={retry.isPending}
            onClick={() => retry.mutate(batchId)}
            className={secondaryButton}
          >
            <RefreshCw aria-hidden className={cn("size-4", retry.isPending && "animate-spin")} />
            {COPY.retry}
          </button>
        </div>
      )}
    </section>
  );
}
