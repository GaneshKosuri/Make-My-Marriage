/** Photo and gallery request schemas (Zod, `.strict()`). Isomorphic. */
import { z } from "zod";

import { objectId } from "@/lib/object-id";

export const photoIdParams = z.object({ photoId: objectId }).strict();

/*
 * TODO(Phase 6: Memories) — define with `.strict()`:
 *   - listPhotosQuerySchema       API_DESIGN §75 + 2026-09-18  cursorQuerySchema + eventId (id | "other")
 *   - photoUploadRequestSchema    API_DESIGN §76, §81           { filename, mimeType (JPEG/PNG/WebP),
 *                                                               sizeBytes 1..10 MiB, eventId? }
 *   - confirmPhotoUploadSchema    API_DESIGN §77, §82           { objectKey, filename, mimeType, sizeBytes, eventId? }
 * Never accept weddingId; staging keys are server-issued.
 */
