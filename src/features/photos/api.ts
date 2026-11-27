"use client";

import {
  type InfiniteData,
  type QueryClient,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";

import { dashboardKeys } from "@/features/dashboard/query-keys";
import { useAppMutation } from "@/lib/use-app-mutation";
import { apiFetch, apiFetchCursorPage } from "@/lib/api-client";
import type { CursorPagination } from "@/lib/pagination";
import type { PhotoDownloadDto, PhotoDto } from "@/modules/photos/photo.types";
import type {
  GallerySettingsDto,
  UpdateGallerySettingsInput,
} from "@/modules/weddings/wedding.types";

import { photosKeys } from "./query-keys";
import type { UploadEndpoints } from "./upload";

/** TanStack Query hooks over the family gallery API (API_DESIGN §75–78 + 2026-09-18 notes). */

/** Signed photo links last 15 minutes: refresh the list before they run out. */
export const PHOTO_LIST_STALE_MS = 10 * 60_000;
/**
 * While the page is visible, lists refresh on their own before the links
 * expire, so tiles scrolled into view later and the viewer keep working (QA G5).
 */
export const PHOTO_URL_REFRESH_MS = 12 * 60_000;
const PAGE_SIZE = 24;

const photoPath = (photoId: string) => `/api/photos/${encodeURIComponent(photoId)}`;

export const MEMBER_UPLOAD_ENDPOINTS: UploadEndpoints = {
  uploadUrl: "/api/photos/upload-url",
  confirm: "/api/photos",
};

/**
 * GET /api/photos (API §75) for one album: `undefined` = all, an event id, or
 * "other" (Wedding Memories). Pages of 24, loaded on demand.
 */
export function usePhotos(album: string | undefined) {
  return useInfiniteQuery({
    queryKey: photosKeys.list({ album }),
    queryFn: ({ pageParam, signal }) =>
      apiFetchCursorPage<PhotoDto>("/api/photos", {
        query: { eventId: album, cursor: pageParam, limit: PAGE_SIZE },
        signal,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.pagination.nextCursor ?? undefined,
    staleTime: PHOTO_LIST_STALE_MS,
    refetchInterval: PHOTO_URL_REFRESH_MS,
  });
}

/** Every published photo in the wedding, for the banner. */
export function usePhotoTotal() {
  return useQuery({
    queryKey: photosKeys.list({ total: true }),
    queryFn: async ({ signal }) => {
      const page = await apiFetchCursorPage<PhotoDto>("/api/photos", {
        query: { limit: 1 },
        signal,
      });
      return page.pagination.total ?? 0;
    },
    staleTime: PHOTO_LIST_STALE_MS,
    refetchInterval: PHOTO_URL_REFRESH_MS,
  });
}

/** Lists, totals and the dashboard's photo count change together. */
export function useInvalidatePhotos() {
  const queryClient = useQueryClient();
  return useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: photosKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      ]),
    [queryClient],
  );
}

/** DELETE /api/photos/:id (API §78). */
export function useDeletePhoto() {
  const queryClient = useQueryClient();
  return useAppMutation({
    mutationFn: (photoId: string) =>
      apiFetch<{ success: true }>(photoPath(photoId), { method: "DELETE" }),
    // Take the photo out of what is loaded instead of re-signing (and
    // re-downloading) every page (QA G5).
    onSuccess: (_result, photoId) => {
      removePhotoFromLists(queryClient, photoId);
      return queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

type PhotoPage = { data: PhotoDto[]; pagination: CursorPagination };

/** Removes one photo from every loaded album list and lowers the totals. */
function removePhotoFromLists(queryClient: QueryClient, photoId: string) {
  queryClient.setQueriesData<InfiniteData<PhotoPage> | number>(
    { queryKey: [...photosKeys.all, "list"] },
    (cached) => {
      if (cached === undefined) return cached;
      if (typeof cached === "number") return Math.max(0, cached - 1);
      const had = cached.pages.some((page) => page.data.some((photo) => photo.id === photoId));
      if (!had) return cached;
      return {
        ...cached,
        pages: cached.pages.map((page) => ({
          data: page.data.filter((photo) => photo.id !== photoId),
          pagination: {
            ...page.pagination,
            total:
              page.pagination.total === undefined
                ? undefined
                : Math.max(0, page.pagination.total - 1),
          },
        })),
      };
    },
  );
}

/**
 * GET /api/photos/:id/download (2026-09-18 notes), then let the browser fetch
 * the file straight from storage (it downloads as the original file name).
 */
export function useDownloadPhoto() {
  return useAppMutation({
    mutationFn: async (photoId: string) => {
      const { url } = await apiFetch<PhotoDownloadDto>(`${photoPath(photoId)}/download`);
      window.location.assign(url);
    },
  });
}

// ── Gallery settings (API §73–74) ──────────────────────────────────────────

/** GET /api/gallery/settings: the switches and the stable gallery link. */
export function useGallerySettings() {
  return useQuery({
    queryKey: photosKeys.gallerySettings(),
    queryFn: ({ signal }) => apiFetch<GallerySettingsDto>("/api/gallery/settings", { signal }),
  });
}

/** PATCH /api/gallery/settings. The answer replaces the cached settings. */
export function useUpdateGallerySettings() {
  const queryClient = useQueryClient();
  return useAppMutation({
    mutationFn: (body: UpdateGallerySettingsInput) =>
      apiFetch<GallerySettingsDto>("/api/gallery/settings", { method: "PATCH", body }),
    onSuccess: (settings) => queryClient.setQueryData(photosKeys.gallerySettings(), settings),
  });
}

// ── Guest gallery (API §79–82) ─────────────────────────────────────────────

const galleryPath = (token: string) => `/api/public/galleries/${encodeURIComponent(token)}`;

/** The guest upload endpoints for this gallery link. */
export function guestUploadEndpoints(token: string): UploadEndpoints {
  return {
    uploadUrl: `${galleryPath(token)}/upload-url`,
    confirm: `${galleryPath(token)}/photos`,
  };
}

/** GET /api/public/galleries/:token/photos (API §79) for one album. */
export function usePublicPhotos(token: string, album: string | undefined) {
  return useInfiniteQuery({
    queryKey: photosKeys.list({ token, album }),
    queryFn: ({ pageParam, signal }) =>
      apiFetchCursorPage<PhotoDto>(`${galleryPath(token)}/photos`, {
        query: { eventId: album, cursor: pageParam, limit: PAGE_SIZE },
        signal,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.pagination.nextCursor ?? undefined,
    staleTime: PHOTO_LIST_STALE_MS,
    refetchInterval: PHOTO_URL_REFRESH_MS,
  });
}
