import { formatShortDate, isOverdue, taskDueDay } from "@/features/dashboard/format";
import { cn } from "@/lib/cn";
import { initialsOf } from "@/lib/couple";
import type { DateOnly } from "@/lib/dates";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type TaskPriority,
} from "@/modules/tasks/task.constants";
import type { TaskDto } from "@/modules/tasks/task.types";

import { TASKS } from "../tasks-content";

const PRIORITY_CHIP: Readonly<Record<TaskPriority, string>> = {
  HIGH: "border-burgundy/20 bg-burgundy/5 text-burgundy",
  MEDIUM: "border-gold/40 bg-gold/10 text-gold-deep",
  LOW: "border-sand bg-white text-plum",
};

export function PriorityChip({ priority }: Readonly<{ priority: TaskPriority }>) {
  return (
    <span
      className={cn("rounded-full border px-2.5 py-0.5 text-label-sm", PRIORITY_CHIP[priority])}
    >
      {TASK_PRIORITY_LABELS[priority]}
    </span>
  );
}

export function OverdueChip() {
  return (
    <span className="rounded-full border border-destructive/30 bg-destructive/5 px-2.5 py-0.5 text-label-sm text-destructive">
      {TASKS.overdue}
    </span>
  );
}

/**
 * Who, which event and when, in the wedding's time zone. A task whose assignee
 * has left shows "Former member"; a link to an archived event says so
 * (API_DESIGN §35 notes). Used by the dashboard and /app/tasks.
 */
export function TaskMeta({
  task,
  timeZone,
  today,
  showStatus = false,
  showEvent = true,
}: Readonly<{
  task: TaskDto;
  timeZone: string;
  today: DateOnly;
  showStatus?: boolean;
  /** Off on the event's own page. */
  showEvent?: boolean;
}>) {
  const overdue = isOverdue(task, today, timeZone);
  const formerMember = task.assignedMembershipId !== null && task.assignee === null;
  const eventLabel = task.event
    ? task.event.archivedAt
      ? TASKS.archivedEvent(task.event.name)
      : task.event.name
    : "";
  return (
    <p className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-plum">
      {task.assignee && (
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span
            aria-hidden
            className="inline-flex size-6 items-center justify-center rounded-full bg-burgundy text-[10px] font-bold text-ivory"
          >
            {initialsOf(task.assignee.name)}
          </span>
          <span className="min-w-0 wrap-anywhere">{task.assignee.name}</span>
        </span>
      )}
      {formerMember && <span className="italic">{TASKS.formerMember}</span>}
      {showEvent && task.event && (
        // One line, cut short with the full name on hover (QA M11).
        <span
          title={eventLabel}
          className="max-w-full truncate rounded-md border border-sand px-2 py-0.5 text-graphite"
        >
          {eventLabel}
        </span>
      )}
      {task.dueDate && (
        <span className={cn(overdue && "font-semibold text-destructive")}>
          {TASKS.due} {formatShortDate(taskDueDay(task.dueDate, timeZone))}
        </span>
      )}
      {showStatus && <span>· {TASK_STATUS_LABELS[task.status]}</span>}
    </p>
  );
}
