import { created, paginated, route } from "@/server/http";
import { tasksService } from "@/modules/tasks";
import { createTaskSchema, listTasksQuerySchema } from "@/modules/tasks/task.schemas";

/** /api/tasks (GET API §34, POST API §35). */

/** GET — API §34: page + filters. */
export const GET = route({
  auth: "member",
  query: listTasksQuerySchema,
  handler: async ({ ctx, query }) => {
    const { items, pagination } = await tasksService.list(ctx, query);
    return paginated(items, pagination);
  },
});

/** POST — API §35. */
export const POST = route({
  auth: "member",
  body: createTaskSchema,
  handler: async ({ ctx, body }) => created(await tasksService.create(ctx, body)),
});
