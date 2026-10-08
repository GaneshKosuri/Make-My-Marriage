/**
 * Wedding request schemas (Zod, `.strict()`). Isomorphic.
 * A client-supplied `weddingId` is never accepted: strict schemas reject it.
 */
import { z } from "zod";

import { WEDDING_SLUG_MAX_LENGTH, WEDDING_SLUG_PATTERN } from "./wedding.constants";

export const weddingSlug = z
  .string()
  .max(WEDDING_SLUG_MAX_LENGTH)
  .regex(WEDDING_SLUG_PATTERN, "Invalid wedding address");

/** `/api/public/weddings/[slug]`. Pair with `invalidParams: "not-found"`. */
export const weddingSlugParams = z.object({ slug: weddingSlug }).strict();

/*
 * TODO — define with `.strict()`:
 *   Phase 1: Foundation
 *     - createWeddingSchema         API_DESIGN §17 (weddingDate YYYY-MM-DD, IANA timeZone, location)
 *     - updateWeddingSchema         API_DESIGN §19 (partial; slug never editable)
 *   Phase 5: Wedding Experience
 *     - updateWebsiteSettingsSchema API_DESIGN §68 { theme, welcomeMessage, isPublished }
 *     - updateLivestreamSchema      API_DESIGN §71–72 { youtubeUrl (YouTube formats only) | null, isEnabled }
 *     - coverUploadRequestSchema    API_DESIGN §83 { mimeType, sizeBytes }
 *   Phase 6: Memories
 *     - updateGallerySettingsSchema API_DESIGN §74 { isEnabled, guestUploadsEnabled }
 */
