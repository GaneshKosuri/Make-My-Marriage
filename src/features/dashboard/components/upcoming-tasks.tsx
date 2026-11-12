import { Circle, CircleDot } from "lucide-react";
import Link from "next/link";

import { OverdueChip, PriorityChip, TaskMeta } from "@/features/tasks/components/task-meta";
import { cn } from "@/lib/cn";
import type { DateOnly } from "@/lib/dates";
import type { TaskDto } from "@/modules/tasks/task.types";

import { DASHBOARD, DASHBOARD_ROUTES } from "../dashboard-content";
import { textLink } from "@/components/ui/button-styles";
import { ArrowLink, DashboardCard, EmptyState } from "@/components/ui/dashboard-card";
import { isOverdue } from "@/lib/schedule";

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
          action={{ label: copy.empty.action, href: DASHBOARD_ROUTES.addTask }}
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
  const overdue = isOverdue(task, today, timeZone);
  const StatusIcon = task.status === "IN_PROGRESS" ? CircleDot : Circle;

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
        <p className="text-label-md wrap-anywhere text-graphite">{task.title}</p>
        <TaskMeta task={task} timeZone={timeZone} today={today} showStatus />
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {overdue && <OverdueChip />}
        <PriorityChip priority={task.priority} />
      </div>
    </div>
  );
}
