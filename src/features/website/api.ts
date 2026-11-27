"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAppMutation } from "@/lib/use-app-mutation";
import { apiFetch } from "@/lib/api-client";
import { putToStorage } from "@/lib/direct-upload";
import type { CoverMimeType, WebsiteTheme } from "@/modules/weddings/wedding.constants";
import type { CoverUploadUrlDto, WebsiteSettingsDto } from "@/modules/weddings/wedding.types";

import { websiteKeys } from "./query-keys";

/** TanStack Query hooks over the website API (API_DESIGN §67–68, §83). */

export interface WebsiteChange {
  theme?: WebsiteTheme;
  welcomeMessage?: string | null;
  isPublished?: boolean;
  showGallery?: boolean;
  coverImageObjectKey?: string | null;
}

const PATH = "/api/wedding/website";

/** GET /api/wedding/website (the cover link is signed, so refresh within 15 minutes). */
export function useWebsiteSettings() {
  return useQuery({
    queryKey: websiteKeys.settings(),
    queryFn: ({ signal }) => apiFetch<WebsiteSettingsDto>(PATH, { signal }),
    staleTime: 10 * 60_000,
  });
}

/** PATCH /api/wedding/website. The answer replaces the cached settings. */
export function useUpdateWebsite() {
  const queryClient = useQueryClient();
  return useAppMutation({
    mutationFn: (body: WebsiteChange) =>
      apiFetch<WebsiteSettingsDto>(PATH, { method: "PATCH", body }),
    onSuccess: (settings) => queryClient.setQueryData(websiteKeys.settings(), settings),
  });
}

/**
 * A new cover photo: ask for a signed PUT (API §83), send the file straight to
 * storage, then save it with the website settings, which checks it.
 */
export function useUploadCover() {
  const queryClient = useQueryClient();
  return useAppMutation({
    mutationFn: async (file: File) => {
      const issued = await apiFetch<CoverUploadUrlDto>("/api/wedding/cover/upload-url", {
        method: "POST",
        body: { mimeType: file.type as CoverMimeType, sizeBytes: file.size },
      });
      await putToStorage(issued, file);
      return apiFetch<WebsiteSettingsDto>(PATH, {
        method: "PATCH",
        body: { coverImageObjectKey: issued.objectKey },
      });
    },
    onSuccess: (settings) => queryClient.setQueryData(websiteKeys.settings(), settings),
  });
}
