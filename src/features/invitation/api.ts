"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { apiFetch } from "@/lib/api-client";
import type {
  PublicInvitationDto,
  RsvpResultDto,
  SubmitRsvpInput,
} from "@/modules/guests/guest.types";

/** Hooks over the public invitation API (API_DESIGN §50–51). No session is involved. */

const invitationKey = (token: string) => ["invitation", token] as const;
const path = (token: string) => `/api/public/invitations/${encodeURIComponent(token)}`;

/** Other tabs with the same invitation open hear about a saved reply here. */
const CHANNEL = "mmm-invitation";
/** This tab, so it ignores its own messages. */
const TAB = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "tab";

type ReplySaved = { token: string; from: string };

const isReplySaved = (data: unknown): data is ReplySaved =>
  typeof data === "object" &&
  data !== null &&
  typeof (data as ReplySaved).token === "string" &&
  typeof (data as ReplySaved).from === "string";

/**
 * GET /api/public/invitations/:token, starting from what the server rendered.
 * Refreshed when the guest comes back to the tab, and when another tab saves a
 * reply (API_DESIGN §50 notes).
 */
export function usePublicInvitation(token: string, initialData: PublicInvitationDto) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event: MessageEvent<unknown>) => {
      // Another tab's reply to this invitation; this tab already has its own.
      if (isReplySaved(event.data) && event.data.token === token && event.data.from !== TAB)
        void queryClient.invalidateQueries({ queryKey: invitationKey(token) });
    };
    return () => channel.close();
  }, [queryClient, token]);
  return useQuery({
    queryKey: invitationKey(token),
    queryFn: ({ signal }) => apiFetch<PublicInvitationDto>(path(token), { signal }),
    initialData,
    // The server just rendered it: no need to fetch again until the guest returns to the tab.
    staleTime: 30_000,
    refetchOnWindowFocus: "always",
  });
}

/** POST /api/public/invitations/:token/rsvp (API §51). */
export function useSubmitRsvp(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SubmitRsvpInput) =>
      apiFetch<RsvpResultDto>(`${path(token)}/rsvp`, { method: "POST", body }),
    onSuccess: (saved) => {
      queryClient.setQueryData<PublicInvitationDto>(invitationKey(token), (current) =>
        current
          ? {
              ...current,
              guest: {
                ...current.guest,
                rsvpStatus: saved.status,
                attendingCount: saved.attendingCount,
              },
            }
          : current,
      );
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel(CHANNEL);
        channel.postMessage({ token, from: TAB } satisfies ReplySaved);
        channel.close();
      }
    },
  });
}

/** Fetches the latest copy, e.g. after the party size changed under a reply. */
export function useRefreshInvitation(token: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: invitationKey(token) });
}
