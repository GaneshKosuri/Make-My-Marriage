import { ok, route, success } from "@/server/http";
import { tasksService } from "@/modules/tasks";
import { taskIdParams, updateTaskSchema } from "@/modules/tasks/task.schemas";

/** /api/tasks/[taskId] (GET API §36, PATCH API §37, DELETE API §38). */

/** GET — API §36. */
export const GET = route({
  auth: "member",
  params: taskIdParams,
  handler: async ({ ctx, params }) => ok(await tasksService.get(ctx, params.taskId)),
});

/** PATCH — API §37. */
export const PATCH = route({
  auth: "member",
  params: taskIdParams,
  body: updateTaskSchema,
  handler: async ({ ctx, params, body }) => ok(await tasksService.update(ctx, params.taskId, body)),
});

/** DELETE — API §38: hard delete. */
export const DELETE = route({
  auth: "member",
  params: taskIdParams,
  handler: async ({ ctx, params }) => {
    await tasksService.delete(ctx, params.taskId);
    return success();
  },
});
