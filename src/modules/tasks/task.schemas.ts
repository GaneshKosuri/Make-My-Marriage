/**
 * Task request schemas (Zod, `.strict()`). Isomorphic: the task form reuses
 * them. A client-supplied `weddingId` or `completedAt` is never accepted.
 */
import { z } from "zod";

import { objectId } from "@/lib/object-id";
import { pageQuerySchema } from "@/lib/pagination";
import { queryFlag } from "@/lib/query";

import {
  DEFAULT_TASK_PRIORITY,
  DEFAULT_TASK_STATUS,
  TASK_DESCRIPTION_MAX_LENGTH,
  TASK_FILTER_NONE,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TITLE_MAX_LENGTH,
} from "./task.constants";

export const taskIdParams = z.object({ taskId: objectId }).strict();

const title = z
  .string()
  .trim()
  .min(1, "Enter the task")
  .max(TASK_TITLE_MAX_LENGTH, "Keep it under 200 characters");

const taskFields = {
  title,
  /** Blank or null clears it. */
  description: z
    .string()
    .trim()
    .max(TASK_DESCRIPTION_MAX_LENGTH, "Keep it under 2,000 characters")
    .nullable()
    .optional(),
  assignedMembershipId: objectId.nullable().optional(),
  eventId: objectId.nullable().optional(),
  /** An ISO instant with an offset; the UI sends midnight in the wedding's time zone. */
  dueDate: z.iso
    .datetime({ offset: true, message: "Choose a valid due date" })
    .nullable()
    .optional(),
  priority: z.enum(TASK_PRIORITIES, "Choose a priority"),
  status: z.enum(TASK_STATUSES, "Choose a status"),
};

/** API_DESIGN §35: priority defaults to MEDIUM and status to TODO. */
export const createTaskSchema = z
  .object({
    ...taskFields,
    priority: taskFields.priority.default(DEFAULT_TASK_PRIORITY),
    status: taskFields.status.default(DEFAULT_TASK_STATUS),
  })
  .strict();

/**
 * API_DESIGN §37: at least one field. `version` is the one last read (binding
 * decision 8): when it is stale the update is refused with CONFLICT; without it
 * the service still checks the version atomically between its read and write.
 */
export const updateTaskSchema = z
  .object({
    ...taskFields,
    title: title.optional(),
    priority: taskFields.priority.optional(),
    status: taskFields.status.optional(),
    version: z.number("Reload the task and try again").int().min(0).optional(),
  })
  .strict()
  .refine(
    (input) => Object.keys(input).some((key) => key !== "version"),
    "Send at least one field to change",
  );

const idOrNone = z.union([objectId, z.literal(TASK_FILTER_NONE)]);

/**
 * API_DESIGN §34: page + filters that combine with AND. `eventId=none` selects
 * general tasks, `assignedMembershipId=none` unassigned ones, `mine=true` the
 * caller's own.
 */
export const listTasksQuerySchema = pageQuerySchema
  .extend({
    status: z.enum(TASK_STATUSES).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    eventId: idOrNone.optional(),
    assignedMembershipId: idOrNone.optional(),
    mine: queryFlag.optional(),
  })
  .strict();
