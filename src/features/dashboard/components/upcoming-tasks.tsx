import { Circle, CircleDot } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/cn";
import { initialsOf } from "@/lib/couple";
import type { DateOnly } from "@/lib/dates";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type TaskPriority,
} from "@/modules/tasks/task.constants";
import type { TaskDto } from "@/modules/tasks/task.types";

import { DASHBOARD, DASHBOARD_ROUTES } from "../dashboard-content";
import { formatShortDate, isOverdue, taskDueDay } from "../format";
import { ArrowLink, DashboardCard, EmptyState, textLink } from "./dashboard-card";

const PRIORITY_CHIP: Readonly<Record<TaskPriority, string>> = {
  HIGH: "border-burgundy/20 bg-burgundy/5 text-burgundy",
  MEDIUM: "border-gold/40 bg-gold/10 text-gold-deep",
  LOW: "border-sand bg-white text-plum",
};

/** PRD §9.3 "Upcoming Tasks": incomplete tasks approaching their due dates. */
export function UpcomingTasks({
  tasks,
  timeZone,
  today,
}: Readonly<{ tasks: readonly TaskDto[]; timeZone: string; today: DateOnly }>) {
  const copy = DASHBOARD.tasks;
  return (
    <DashboardCard
      title={copy.title}
      actions={
        tasks.length > 0 && (
          <>
            <Link href={DASHBOARD_ROUTES.tasks} className={textLink}>
              {copy.all}
            </Link>
            <span aria-hidden className="h-4 w-px bg-sand" />
            <Link href={DASHBOARD_ROUTES.myTasks} className={textLink}>
              {copy.mine}
            </Link>
          </>
        )
      }
    >
      {tasks.length === 0 ? (
        <EmptyState
          title={copy.empty.title}
          description={copy.empty.description}
          action={{ label: copy.empty.action, href: DASHBOARD_ROUTES.tasks }}
        />
      ) : (
        <>
          <ul className="divide-y divide-sand border-t border-sand">
            {tasks.map((task) => (
              <li key={task.id}>
                <TaskRow task={task} timeZone={timeZone} today={today} />
              </li>
            ))}
          </ul>
          <div className="border-t border-sand pt-4">
            <ArrowLink href={DASHBOARD_ROUTES.tasks}>{copy.all}</ArrowLink>
          </div>
        </>
      )}
    </DashboardCard>
  );
}

function TaskRow({
  task,
  timeZone,
  today,
}: Readonly<{ task: TaskDto; timeZone: string; today: DateOnly }>) {
  const copy = DASHBOARD.tasks;
  const overdue = isOverdue(task, today, timeZone);
  const StatusIcon = task.status === "IN_PROGRESS" ? CircleDot : Circle;
  const assignee = task.assignee?.name ?? null;

  return (
    <div className="flex items-start gap-3 py-4">
      <StatusIcon
        aria-hidden
        className={cn(
          "mt-0.5 size-5 shrink-0",
          task.status === "IN_PROGRESS" ? "text-gold-deep" : "text-plum/60",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-label-md text-graphite">{task.title}</p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-plum">
          {assignee && (
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-flex size-6 items-center justify-center rounded-full bg-burgundy text-[10px] font-bold text-ivory"
              >
                {initialsOf(assignee)}
              </span>
              <span>{assignee}</span>
            </span>
          )}
          {task.event && (
            <span className="rounded-md border border-sand px-2 py-0.5 text-graphite">
              {task.event.name}
            </span>
          )}
          {task.dueDate && (
            <span className={cn(overdue && "font-semibold text-destructive")}>
              {copy.due} {formatShortDate(taskDueDay(task.dueDate, timeZone))}
            </span>
          )}
          <span>· {TASK_STATUS_LABELS[task.status]}</span>
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {overdue && (
          <span className="rounded-full border border-destructive/30 bg-destructive/5 px-2.5 py-0.5 text-label-sm text-destructive">
            {copy.overdue}
          </span>
        )}
        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-label-sm",
            PRIORITY_CHIP[task.priority],
          )}
        >
          {TASK_PRIORITY_LABELS[task.priority]}
        </span>
      </div>
    </div>
  );
}
