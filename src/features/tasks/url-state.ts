/**
 * Reads /app/tasks search params into a view and filters, ignoring anything
 * unexpected (a stale or hand-edited link just shows all tasks).
 */
import { OBJECT_ID_PATTERN } from "@/lib/object-id";
import {
  TASK_FILTER_NONE,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from "@/modules/tasks/task.constants";

import type { TaskFilters } from "./components/tasks-screen";
import { TASK_VIEWS, TASKS_PARAMS, type TaskView } from "./tasks-content";

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const oneOf = <T extends string>(options: readonly T[], value: string | undefined) =>
  options.includes(value as T) ? (value as T) : undefined;
const idOrNone = (value: string | undefined) =>
  value === TASK_FILTER_NONE || (value && OBJECT_ID_PATTERN.test(value)) ? value : undefined;

export function readTasksUrl(params: SearchParams): {
  view: TaskView;
  filters: TaskFilters;
  startAdding: boolean;
} {
  const view =
    oneOf(TASK_VIEWS, first(params[TASKS_PARAMS.view])) ??
    (first(params[TASKS_PARAMS.mine]) === "true" ? "mine" : "all");
  const filters: TaskFilters = {
    status: oneOf<TaskStatus>(TASK_STATUSES, first(params.status)),
    priority: oneOf<TaskPriority>(TASK_PRIORITIES, first(params.priority)),
    eventId: idOrNone(first(params[TASKS_PARAMS.eventId])),
    assignedMembershipId: idOrNone(first(params.assignedMembershipId)),
  };
  for (const key of Object.keys(filters) as (keyof TaskFilters)[]) {
    if (filters[key] === undefined) delete filters[key];
  }
  return { view, filters, startAdding: first(params[TASKS_PARAMS.add]) === "1" };
}
