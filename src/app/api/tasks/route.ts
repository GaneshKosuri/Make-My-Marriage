import { notImplemented, route } from "@/server/http";

/**
 * /api/tasks — stub (GET API §34, POST API §35).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 2: Planning.
 */

/** GET — API §34. */
export const GET = route({
  auth: "member",
  // Phase 2: Planning: paginated(...(await tasksService.list(ctx, query)))
  handler: () => notImplemented("Phase 2: Planning"),
});

/** POST — API §35. */
export const POST = route({
  auth: "member",
  // Phase 2: Planning: created(await tasksService.create(ctx, body))
  handler: () => notImplemented("Phase 2: Planning"),
});
