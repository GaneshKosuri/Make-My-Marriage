import { notImplemented, route } from "@/server/http";
import { guestIdParams } from "@/modules/guests/guest.schemas";

/**
 * /api/guests/[guestId] — stub (GET API §41, PATCH API §42, DELETE API §43).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 3: Guests.
 */

/** GET — API §41. */
export const GET = route({
  auth: "member",
  params: guestIdParams,
  // Phase 3: Guests: ok(await guestsService.get(ctx, params.guestId))
  handler: () => notImplemented("Phase 3: Guests"),
});

/** PATCH — API §42. */
export const PATCH = route({
  auth: "member",
  params: guestIdParams,
  // Phase 3: Guests: ok(await guestsService.update(ctx, params.guestId, body))
  handler: () => notImplemented("Phase 3: Guests"),
});

/** DELETE — API §43. */
export const DELETE = route({
  auth: "member",
  params: guestIdParams,
  // Phase 3: Guests: await guestsService.delete(ctx, params.guestId); return noContent()
  handler: () => notImplemented("Phase 3: Guests"),
});
