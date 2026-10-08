/** Guest, invitation and RSVP request schemas (Zod, `.strict()`). Isomorphic. */
import { z } from "zod";

import { objectId } from "@/lib/object-id";

export const guestIdParams = z.object({ guestId: objectId }).strict();

/*
 * TODO(Phase 3: Guests) — define with `.strict()`:
 *   - listGuestsQuerySchema       API_DESIGN §39  pageQuerySchema + search (≤120, literal), rsvpStatus,
 *                                                 eventId, invitationSent=true|false
 *   - createGuestSchema           API_DESIGN §40  name 1–120, email|"" ≤254, phone ≤40, notes ≤2000,
 *                                                 maxGuests 1–10000 (default 1), invitedEventIds ≤100 unique
 *   - updateGuestSchema           API_DESIGN §42  partial + version; never RSVP/token/delivery fields
 *   - bulkSendSchema              API_DESIGN §47  { scope: ALL_UNSENT | ALL_PENDING_RSVP | SELECTED, guestIds? }
 *   - submitRsvpSchema            API_DESIGN §51  ATTENDING: 1 ≤ attendingCount ≤ maxGuests (service-checked);
 *                                                 NOT_ATTENDING: attendingCount = 0
 */
