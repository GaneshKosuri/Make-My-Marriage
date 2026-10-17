import "server-only";

import type { IdentityWedding } from "@/server/auth/identity";

import type { WeddingRecord } from "./wedding.model";
import type { CreatedWeddingDto } from "./wedding.types";

/**
 * Document → DTO. Never exposes `gallery.token` except through the explicit
 * share-URL paths (API_DESIGN §73, §84), and never `deletedAt` internals.
 * TODO: toWeddingDto (Phase 1, GET /api/wedding), toWebsiteSettingsDto / toPublicWeddingDto (Phase 5),
 * toGallerySettingsDto (Phase 6).
 */
export function toIdentityWedding(wedding: WeddingRecord): IdentityWedding {
  return {
    id: wedding._id.toString(),
    brideName: wedding.brideName,
    groomName: wedding.groomName,
    title: wedding.title ?? null,
    weddingDate: wedding.weddingDate,
    timeZone: wedding.timeZone,
  };
}

/** POST /api/wedding (API_DESIGN §17). */
export function toCreatedWeddingDto(wedding: WeddingRecord): CreatedWeddingDto {
  return {
    id: wedding._id.toString(),
    brideName: wedding.brideName,
    groomName: wedding.groomName,
    weddingDate: wedding.weddingDate,
    website: { slug: wedding.website.slug },
  };
}
