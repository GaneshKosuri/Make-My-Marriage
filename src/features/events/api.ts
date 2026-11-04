"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiAction, apiFetch } from "@/lib/api-client";
import type { EventDto } from "@/modules/events/event.types";

import { dashboardKeys } from "@/features/dashboard/query-keys";
import { tasksKeys } from "@/features/tasks/query-keys";

import type { CreateEventBody, UpdateEventBody } from "./event-form";
import { eventsKeys } from "./query-keys";

/** TanStack Query hooks over the Events REST API (API_DESIGN §29–33). */

/** GET /api/events (API §29): start-time order; archived ones only when asked. */
export function useEvents(includeArchived = false) {
  return useQuery({
    queryKey: eventsKeys.list({ includeArchived }),
    queryFn: ({ signal }) =>
      apiFetch<EventDto[]>("/api/events", { query: { includeArchived }, signal }),
  });
}

/** GET /api/events/:id (API §31), archived ones included. */
export function useEvent(eventId: string) {
  return useQuery({
    queryKey: eventsKeys.detail(eventId),
    queryFn: ({ signal }) =>
      apiFetch<EventDto>(`/api/events/${encodeURIComponent(eventId)}`, { signal }),
  });
}

/**
 * Lists, details and the dashboard's upcoming events and count all change
 * together. Tasks too: they show their event's name and archived state.
 */
function useInvalidateEvents() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: eventsKeys.all }),
      queryClient.invalidateQueries({ queryKey: tasksKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
    ]);
}

/** The latest copy of one event, e.g. to reload an edit form after a CONFLICT. */
export function useReloadEvent() {
  const queryClient = useQueryClient();
  return (eventId: string) =>
    queryClient.fetchQuery({
      queryKey: eventsKeys.detail(eventId),
      queryFn: ({ signal }) =>
        apiFetch<EventDto>(`/api/events/${encodeURIComponent(eventId)}`, { signal }),
      staleTime: 0,
    });
}

/** POST /api/events (API §30). */
export function useCreateEvent() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (body: CreateEventBody) =>
      apiFetch<EventDto>("/api/events", { method: "POST", body }),
    onSuccess: invalidate,
  });
}

/** PATCH /api/events/:id (API §32): changed fields plus the version they were read at. */
export function useUpdateEvent() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: ({ eventId, body }: { eventId: string; body: UpdateEventBody }) =>
      apiFetch<EventDto>(`/api/events/${encodeURIComponent(eventId)}`, {
        method: "PATCH",
        body,
      }),
    onSuccess: invalidate,
  });
}

/** DELETE /api/events/:id (API §33): archives the event. */
export function useArchiveEvent() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (eventId: string) =>
      apiAction(`/api/events/${encodeURIComponent(eventId)}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}
