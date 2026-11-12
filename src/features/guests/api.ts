"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { dashboardKeys } from "@/features/dashboard/query-keys";
import { apiAction, apiFetch, apiFetchPage } from "@/lib/api-client";
import type { RsvpStatus } from "@/modules/guests/guest.constants";
import type { GuestDto, RsvpSummaryDto } from "@/modules/guests/guest.types";

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

/** Lists, the summary and the dashboard's guest and RSVP counts change together. */
function useInvalidateGuests() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: guestsKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
    ]);
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
