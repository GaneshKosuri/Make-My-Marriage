/**
 * The add/edit task form (PRD §9.6). The due date is a calendar day in the
 * wedding's time zone; the API stores midnight of that day as a UTC instant
 * (API_DESIGN §35). Blank selects mean "nobody" / "no event" / "no due date".
 */
import { z } from "zod";

import {
  dateOnlyInTimeZone,
  isValidDateOnly,
  zonedDateTimeToInstant,
  type DateOnly,
} from "@/lib/dates";
import {
  DEFAULT_TASK_PRIORITY,
  DEFAULT_TASK_STATUS,
  TASK_DESCRIPTION_MAX_LENGTH,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TITLE_MAX_LENGTH,
} from "@/modules/tasks/task.constants";
import type { createTaskSchema, updateTaskSchema } from "@/modules/tasks/task.schemas";
import type { TaskDto } from "@/modules/tasks/task.types";

export const taskFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Enter the task")
      .max(TASK_TITLE_MAX_LENGTH, "Keep it under 200 characters"),
    description: z
      .string()
      .trim()
      .max(TASK_DESCRIPTION_MAX_LENGTH, "Keep it under 2,000 characters"),
    assignedMembershipId: z.string(),
    eventId: z.string(),
    dueDate: z
      .string()
      .refine((value) => value === "" || isValidDateOnly(value), "Choose a valid date"),
    priority: z.enum(TASK_PRIORITIES),
    status: z.enum(TASK_STATUSES),
  })
  .strict();

export type TaskFormValues = z.input<typeof taskFormSchema>;
type ParsedTaskForm = z.output<typeof taskFormSchema>;
export type CreateTaskBody = z.input<typeof createTaskSchema>;
export type UpdateTaskBody = z.input<typeof updateTaskSchema>;

/** The API's field names for VALIDATION_ERROR details are the form's own. */
export const TASK_SERVER_FIELDS = [
  "title",
  "description",
  "assignedMembershipId",
  "eventId",
  "dueDate",
  "priority",
  "status",
] as const satisfies readonly (keyof TaskFormValues)[];

export function emptyTaskForm(preset: { eventId?: string } = {}): TaskFormValues {
  return {
    title: "",
    description: "",
    assignedMembershipId: "",
    eventId: preset.eventId ?? "",
    dueDate: "",
    priority: DEFAULT_TASK_PRIORITY,
    status: DEFAULT_TASK_STATUS,
  };
}

/** A stored task as the form edits it, with the due day in the wedding's time zone. */
export function taskToForm(task: TaskDto, timeZone: string): TaskFormValues {
  return {
    title: task.title,
    description: task.description ?? "",
    assignedMembershipId: task.assignedMembershipId ?? "",
    eventId: task.event?.id ?? "",
    dueDate: task.dueDate ? dateOnlyInTimeZone(new Date(task.dueDate), timeZone) : "",
    priority: task.priority,
    status: task.status,
  };
}

/** Midnight of the due day in the wedding's time zone, as a UTC instant. */
export function dueDateInstant(day: DateOnly | "", timeZone: string): string | null {
  return day ? zonedDateTimeToInstant(day, "00:00", timeZone).toISOString() : null;
}

/** POST /api/tasks body (API_DESIGN §35). */
export function toCreateTaskBody(values: ParsedTaskForm, timeZone: string): CreateTaskBody {
  return {
    title: values.title,
    description: values.description || null,
    assignedMembershipId: values.assignedMembershipId || null,
    eventId: values.eventId || null,
    dueDate: dueDateInstant(values.dueDate, timeZone),
    priority: values.priority,
    status: values.status,
  };
}

/**
 * PATCH /api/tasks/:id body (API_DESIGN §37): only what changed, plus the
 * version the form was loaded from. An untouched due date keeps its stored instant.
 */
export function toUpdateTaskBody(
  values: ParsedTaskForm,
  dirty: Partial<Record<keyof TaskFormValues, boolean | undefined>>,
  timeZone: string,
  version: number,
): UpdateTaskBody {
  const body: UpdateTaskBody = {};
  if (dirty.title) body.title = values.title;
  if (dirty.description) body.description = values.description || null;
  if (dirty.assignedMembershipId) body.assignedMembershipId = values.assignedMembershipId || null;
  if (dirty.eventId) body.eventId = values.eventId || null;
  if (dirty.dueDate) body.dueDate = dueDateInstant(values.dueDate, timeZone);
  if (dirty.priority) body.priority = values.priority;
  if (dirty.status) body.status = values.status;
  return { ...body, version };
}
