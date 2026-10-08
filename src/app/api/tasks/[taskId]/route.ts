import { notImplemented, route } from "@/server/http";
import { taskIdParams } from "@/modules/tasks/task.schemas";

/**
 * /api/tasks/[taskId] — stub (GET API §36, PATCH API §37, DELETE API §38).
 * Answers 501 NOT_IMPLEMENTED once auth and params pass; implemented in Phase 2: Planning.
 */

/** GET — API §36. */
export const GET = route({
  auth: "member",
  params: taskIdParams,
  // Phase 2: Planning: ok(await tasksService.get(ctx, params.taskId))
  handler: () => notImplemented("Phase 2: Planning"),
});

/** PATCH — API §37. */
export const PATCH = route({
  auth: "member",
  params: taskIdParams,
  // Phase 2: Planning: ok(await tasksService.update(ctx, params.taskId, body))
  handler: () => notImplemented("Phase 2: Planning"),
});

/** DELETE — API §38. */
export const DELETE = route({
  auth: "member",
  params: taskIdParams,
  // Phase 2: Planning: await tasksService.delete(ctx, params.taskId); return noContent()
  handler: () => notImplemented("Phase 2: Planning"),
});
