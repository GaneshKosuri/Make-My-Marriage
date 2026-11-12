"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { textLink } from "@/components/ui/button-styles";
import { ArrowLink, DashboardCard } from "@/components/ui/dashboard-card";
import type { DateOnly } from "@/lib/dates";
import type { TaskDto } from "@/modules/tasks/task.types";

import { useTasks } from "../api";
import { TASKS, TASKS_ROUTES } from "../tasks-content";
import { TaskFormDialog } from "./task-form-dialog";
import { TaskItem } from "./tasks-screen";

/** An event page shows up to this many of its tasks, newest first. */
const EVENT_TASKS_LIMIT = 50;

/**
 * "Tasks for this event" on /app/events/[id] (PRD §9.5): tick them off or open
 * one to edit; add another already linked to the event (not for archived events).
 */
export function EventTasks({
  eventId,
  archived,
  timeZone,
  today,
}: Readonly<{ eventId: string; archived: boolean; timeZone: string; today: DateOnly }>) {
  const tasks = useTasks({ eventId, limit: EVENT_TASKS_LIMIT });
  const [editing, setEditing] = useState<TaskDto | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const copy = TASKS.forEvent;
  const list = tasks.data?.data ?? [];
  const total = tasks.data?.pagination.total ?? 0;
  // After a refetch the form follows the latest copy of the task.
  const editingTask = editing
    ? (list.find((task) => task.id === editing.id) ?? editing)
    : undefined;

  return (
    <DashboardCard
      title={copy.title}
      actions={
        !archived && (
          <Link href={TASKS_ROUTES.addForEvent(eventId)} className={textLink}>
            <Plus aria-hidden className="size-4" />
            {copy.add}
          </Link>
        )
      }
    >
      {notice && (
        <p role="status" className="mb-3 text-body-md text-graphite">
          {notice}
        </p>
      )}
      {tasks.isPending ? (
        <div
          aria-busy="true"
          aria-label="Loading"
          className="h-16 animate-pulse rounded-xl bg-sand"
        />
      ) : tasks.isError ? (
        <p role="alert" className="text-body-md text-destructive">
          {TASKS.loadError.title}
        </p>
      ) : list.length === 0 ? (
        <p className="text-body-md text-plum">{copy.empty}</p>
      ) : (
        <>
          <ul className="divide-y divide-sand border-t border-sand">
            {list.map((task) => (
              <li key={task.id}>
                <TaskItem
                  task={task}
                  timeZone={timeZone}
                  today={today}
                  onEdit={(next) => {
                    setNotice(null);
                    setEditing(next);
                  }}
                  onNotice={setNotice}
                  showEvent={false}
                />
              </li>
            ))}
          </ul>
          {total > list.length && (
            <div className="border-t border-sand pt-4">
              <ArrowLink href={TASKS_ROUTES.forEvent(eventId)}>{copy.all}</ArrowLink>
            </div>
          )}
        </>
      )}
      <TaskFormDialog
        open={editingTask !== undefined}
        onClose={() => setEditing(null)}
        task={editingTask}
        timeZone={timeZone}
        today={today}
        onSaved={(task) => {
          setNotice(TASKS.form.updated(task.title));
          setEditing(null);
        }}
        onDeleted={(task) => {
          setNotice(TASKS.form.deleted(task.title));
          setEditing(null);
        }}
      />
    </DashboardCard>
  );
}
