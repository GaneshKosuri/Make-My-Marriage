"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

import { dashboardKeys } from "@/features/dashboard/query-keys";
import { apiAction, apiFetch, apiFetchPage } from "@/lib/api-client";
import type { RsvpStatus } from "@/modules/guests/guest.constants";
import type { EmailBatchStatusDto } from "@/modules/email-jobs/email-job.types";
import type {
  BulkEmailResultDto,
  GuestDto,
  InvitationLinkDto,
  RsvpSummaryDto,
  SendInvitationsInput,
  SendRemindersInput,
} from "@/modules/guests/guest.types";

import type { CreateGuestBody, UpdateGuestBody } from "./guest-form";
import { guestsKeys } from "./query-keys";

/** TanStack Query hooks over the Guests REST API (API_DESIGN §39–43, §52). */

export interface GuestsQuery {
  page?: number;
  limit?: number;
  search?: string;
  rsvpStatus?: RsvpStatus;
  eventId?: string;
  invitationSent?: boolean;
}

/** GET /api/guests (API §39): one page in name order. The last page stays on screen while the next loads. */
export function useGuests(query: GuestsQuery) {
  return useQuery({
    queryKey: guestsKeys.list({ ...query }),
    queryFn: ({ signal }) => apiFetchPage<GuestDto>("/api/guests", { query: { ...query }, signal }),
    placeholderData: keepPreviousData,
  });
}

/** GET /api/guests/:id (API §41). */
export function useGuest(guestId: string) {
  return useQuery({
    queryKey: guestsKeys.detail(guestId),
    queryFn: ({ signal }) =>
      apiFetch<GuestDto>(`/api/guests/${encodeURIComponent(guestId)}`, { signal }),
  });
}

/** GET /api/guests/rsvp-summary (API §52): invitations by reply, and people coming. */
export function useRsvpSummary() {
  return useQuery({
    queryKey: guestsKeys.rsvpSummary(),
    queryFn: ({ signal }) => apiFetch<RsvpSummaryDto>("/api/guests/rsvp-summary", { signal }),
  });
}

/**
 * GET /api/guests/:id/invitation-link (API §45). The link never changes, so it
 * is fetched once per guest.
 */
export function useInvitationLink(guestId: string) {
  return useQuery({
    queryKey: guestsKeys.invitationLink(guestId),
    queryFn: ({ signal }) =>
      apiFetch<InvitationLinkDto>(`/api/guests/${encodeURIComponent(guestId)}/invitation-link`, {
        signal,
      }),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

/** Lists, the summary and the dashboard's guest and RSVP counts change together. */
function useInvalidateGuests() {
  const queryClient = useQueryClient();
  return useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: guestsKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      ]),
    [queryClient],
  );
}

/** POST /api/guests (API §40). */
export function useCreateGuest() {
  const invalidate = useInvalidateGuests();
  return useMutation({
    mutationFn: (body: CreateGuestBody) =>
      apiFetch<GuestDto>("/api/guests", { method: "POST", body }),
    onSuccess: invalidate,
  });
}

/** PATCH /api/guests/:id (API §42): changed fields plus the version they were read at. */
export function useUpdateGuest() {
  const invalidate = useInvalidateGuests();
  return useMutation({
    mutationFn: ({ guestId, body }: { guestId: string; body: UpdateGuestBody }) =>
      apiFetch<GuestDto>(`/api/guests/${encodeURIComponent(guestId)}`, { method: "PATCH", body }),
    onSuccess: invalidate,
  });
}

/** DELETE /api/guests/:id (API §43): permanent; the invitation link stops working. */
export function useDeleteGuest() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateGuests();
  return useMutation({
    mutationFn: (guestId: string) =>
      apiAction(`/api/guests/${encodeURIComponent(guestId)}`, { method: "DELETE" }),
    onSuccess: (_result, guestId) => {
      // Don't refetch the deleted guest's own page: it would only answer 404.
      queryClient.removeQueries({ queryKey: guestsKeys.detail(guestId) });
      return invalidate();
    },
  });
}

/**
 * The latest copy of one guest, e.g. to reload an edit form after a CONFLICT.
 * Lists are refreshed too.
 */
export function useReloadGuest() {
  const queryClient = useQueryClient();
  return async (guestId: string) => {
    const guest = await queryClient.fetchQuery({
      queryKey: guestsKeys.detail(guestId),
      queryFn: ({ signal }) =>
        apiFetch<GuestDto>(`/api/guests/${encodeURIComponent(guestId)}`, { signal }),
      staleTime: 0,
    });
    void queryClient.invalidateQueries({ queryKey: guestsKeys.all });
    return guest;
  };
}

/** POST /api/guests/:id/send-invitation or /send-reminder (API §46, §48): sent now. */
export function useEmailGuest() {
  const invalidate = useInvalidateGuests();
  return useMutation({
    mutationFn: ({ guestId, kind }: { guestId: string; kind: "invitation" | "reminder" }) =>
      apiAction(
        `/api/guests/${encodeURIComponent(guestId)}/${kind === "invitation" ? "send-invitation" : "send-reminder"}`,
        { method: "POST" },
      ),
    onSuccess: invalidate,
  });
}

/** POST /api/guests/actions/send-invitations or /send-reminders (API §47, §49): queued. */
export function useEmailGuestsInBulk() {
  const invalidate = useInvalidateGuests();
  return useMutation({
    mutationFn: (
      request:
        | { kind: "invitations"; body: SendInvitationsInput }
        | { kind: "reminders"; body: SendRemindersInput },
    ) =>
      apiFetch<BulkEmailResultDto>(
        `/api/guests/actions/${request.kind === "invitations" ? "send-invitations" : "send-reminders"}`,
        { method: "POST", body: request.body },
      ),
    // Offline, fail at once ("Try again") rather than wait on "Starting…".
    networkMode: "always",
    onSuccess: invalidate,
  });
}

/** How often an open progress panel checks on a bulk send. */
const BATCH_POLL_MS = 3000;
/** Once nothing has gone out for a while (e.g. a daily sending limit), checks slow down. */
const BATCH_SLOW_POLL_MS = 15_000;

/** What a check found that changes the guest lists. */
const progressOf = (status: EmailBatchStatusDto) =>
  `${status.sent}:${status.failed}:${status.cancelled}:${status.completed}`;

/**
 * GET /api/email-batches/:id (API §85), checked every few seconds until the
 * batch is done, more slowly while it is `waiting`. Each check also keeps the
 * sending going. Stops on an error (an unknown or empty batch answers 404).
 * Guest lists and counts refresh only when a check finds more emails done.
 */
export function useEmailBatch(batchId: string | null, { waiting = false } = {}) {
  const invalidate = useInvalidateGuests();
  const query = useQuery({
    queryKey: guestsKeys.emailBatch(batchId ?? ""),
    queryFn: ({ signal }) =>
      apiFetch<EmailBatchStatusDto>(`/api/email-batches/${encodeURIComponent(batchId!)}`, {
        signal,
      }),
    enabled: batchId !== null,
    retry: false,
    refetchInterval: (current) =>
      current.state.status === "error" || current.state.data?.completed
        ? false
        : waiting
          ? BATCH_SLOW_POLL_MS
          : BATCH_POLL_MS,
  });

  const seen = useRef<string | null>(null);
  const { data } = query;
  useEffect(() => {
    if (!data) return;
    const progress = progressOf(data);
    if (progress === seen.current) return;
    // The first check only refreshes when emails already went out.
    const first = seen.current === null;
    seen.current = progress;
    if (!first || data.sent + data.failed + data.cancelled > 0) void invalidate();
  }, [data, invalidate]);
  return query;
}

/** POST /api/email-batches/:id/retry-failed (API §86). */
export function useRetryFailedEmails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) =>
      apiFetch<EmailBatchStatusDto>(
        `/api/email-batches/${encodeURIComponent(batchId)}/retry-failed`,
        { method: "POST" },
      ),
    onSuccess: (status) => queryClient.setQueryData(guestsKeys.emailBatch(status.batchId), status),
  });
}
