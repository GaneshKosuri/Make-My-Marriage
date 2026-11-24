"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";
import type { LivestreamSettingsDto } from "@/modules/weddings/wedding.types";

import { livestreamKeys } from "./query-keys";

/** TanStack Query hooks over the livestream API (API_DESIGN §70–72). */

/** The request body: a pasted link (null removes it) and/or the switch. */
export interface LivestreamChange {
  youtubeUrl?: string | null;
  isEnabled?: boolean;
}

/** GET /api/wedding/livestream. */
export function useLivestream() {
  return useQuery({
    queryKey: livestreamKeys.settings(),
    queryFn: ({ signal }) => apiFetch<LivestreamSettingsDto>("/api/wedding/livestream", { signal }),
  });
}

/** PATCH /api/wedding/livestream. The answer replaces the cached settings. */
export function useUpdateLivestream() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: LivestreamChange) =>
      apiFetch<LivestreamSettingsDto>("/api/wedding/livestream", { method: "PATCH", body }),
    onSuccess: (settings) => queryClient.setQueryData(livestreamKeys.settings(), settings),
  });
}
