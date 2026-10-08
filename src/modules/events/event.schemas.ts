/** Event request schemas (Zod, `.strict()`). Isomorphic. */
import { z } from "zod";

import { objectId } from "@/lib/object-id";

export const eventIdParams = z.object({ eventId: objectId }).strict();

/*
 * TODO(Phase 2: Planning) — define with `.strict()`:
 *   - listEventsQuerySchema   API_DESIGN §29  { includeArchived?, from?, to? }
 *   - createEventSchema       API_DESIGN §30  name + startsAt required; ISO date-times WITH offset;
 *                                             endsAt > startsAt; "" clears optional text, null clears endsAt
 *   - updateEventSchema       API_DESIGN §32  partial + expected version (__v) for CONFLICT detection
 * Phase 5: coverUploadRequestSchema lives in @/modules/weddings/wedding.schemas (API_DESIGN §83).
 */
