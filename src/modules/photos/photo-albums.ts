import "server-only";

import type { CursorResult } from "@/lib/pagination";
import { decodeCursor, sliceCursorPage } from "@/server/http/pagination";
import { getStorageService } from "@/server/storage";

import { PHOTO_EVENT_FILTER_OTHER } from "./photo.constants";
import { toPhotoDtos } from "./photo.mapper";
import { photoRepository, type PhotoAlbumFilter } from "./photo.repository";
import type { ListPhotosQuery, PhotoDto } from "./photo.types";

/** The album a list asks for, and the scope its cursor is bound to. */
function albumOf(eventId: string | undefined): { filter: PhotoAlbumFilter; scope: string } {
  if (eventId === undefined) return { filter: {}, scope: "all" };
  if (eventId === PHOTO_EVENT_FILTER_OTHER) return { filter: { eventId: null }, scope: "other" };
  return { filter: { eventId }, scope: eventId };
}

/**
 * READY photos of one album newest first, with the album's total (API §75,
 * §79). A cursor only works for the album it was issued for. Shared by the
 * family and the guest gallery.
 */
export async function listAlbumPhotos(
  weddingId: string,
  query: ListPhotosQuery,
): Promise<CursorResult<PhotoDto>> {
  const { filter, scope } = albumOf(query.eventId);
  const after = query.cursor ? decodeCursor(query.cursor, scope) : undefined;
  const [rows, total] = await Promise.all([
    photoRepository.listReady(weddingId, filter, { after, limit: query.limit }),
    photoRepository.countReady(weddingId, filter),
  ]);
  const { items, nextCursor } = sliceCursorPage(rows, query.limit, scope);
  return {
    items: await toPhotoDtos(items, getStorageService()),
    pagination: { nextCursor, total },
  };
}
