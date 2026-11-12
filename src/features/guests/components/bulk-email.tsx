"use client";

import { CheckCircle2, Mail, RefreshCw, X } from "lucide-react";
import { useState } from "react";

import { focusRing, primaryButton, secondaryButton } from "@/components/ui/button-styles";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";

import { useEmailBatch, useEmailGuestsInBulk, useRetryFailedEmails } from "../api";
import { GUESTS } from "../guests-content";

const COPY = GUESTS.bulk;

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
  if (count === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          send.reset();
          setConfirming(true);
        }}
        className={secondaryButton}
      >
        <Mail aria-hidden className="size-4" />
        {copy.button(count)}
      </button>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={copy.title}
        description={copy.description(count)}
      >
        {send.isError && (
          <p role="alert" className="mb-4 text-body-md text-destructive">
            {COPY.error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
          <button type="button" onClick={() => setConfirming(false)} className={secondaryButton}>
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
  const batch = useEmailBatch(batchId);
  const retry = useRetryFailedEmails();
  // Counts consecutive checks in which nothing more was sent.
  const [stall, setStall] = useState({ sent: -1, checks: 0, at: 0 });
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
          {done ? (
            <CheckCircle2 aria-hidden className="size-5 shrink-0 text-gold-deep" />
          ) : (
            <Mail aria-hidden className="size-5 shrink-0 text-gold-deep" />
          )}
          <span>
            {!status
              ? COPY.working
              : done
                ? copy.done(status.sent)
                : copy.progress(status.sent, total)}
          </span>
        </p>
        {done && (
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
      {!done && (
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
      {status && !done && (
        <p className="text-body-sm text-plum">
          {stall.checks >= STALLED_CHECKS ? COPY.waiting : COPY.background}
        </p>
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
