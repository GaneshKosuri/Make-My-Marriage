"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  FormAlert,
  OptionalTag,
  SelectField,
  TextAreaField,
  TextField,
} from "@/features/auth/components/form-controls";
import { focusRing, primaryButton } from "@/features/dashboard/components/dashboard-card";
import { useEvents } from "@/features/events/api";
import { useMembers } from "@/features/members/api";
import { Dialog } from "@/features/members/components/dialog";
import { timeZoneLabel } from "@/features/weddings/create-wedding-content";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
} from "@/modules/tasks/task.constants";
import type { EventDto } from "@/modules/events/event.types";
import type { MemberDto } from "@/modules/members/member.types";
import type { TaskDto } from "@/modules/tasks/task.types";

import { useCreateTask, useDeleteTask, useRefreshTasks, useUpdateTask } from "../api";
import {
  emptyTaskForm,
  TASK_SERVER_FIELDS,
  taskFormSchema,
  taskToForm,
  toCreateTaskBody,
  toUpdateTaskBody,
} from "../task-form";
import { TASKS } from "../tasks-content";

const FORM = TASKS.form;
const FIELDS = FORM.fields;

const secondaryButton = cn(
  "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-sand bg-white px-5 text-label-md text-graphite hover:bg-sand disabled:opacity-60",
  focusRing,
);

export interface TaskFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** The task being edited; adds a new one when absent. */
  task?: TaskDto;
  /** Pre-selected event for a new task (from an event's page). */
  initialEventId?: string;
  timeZone: string;
  onSaved: (task: TaskDto) => void;
  onDeleted?: (task: TaskDto) => void;
}

/**
 * Add or edit a task (PRD §9.6) in the dashboard dialog. Edits send only what
 * changed, with the version the form was loaded at. Deleting asks first.
 */
export function TaskFormDialog(props: Readonly<TaskFormDialogProps>) {
  const { open, onClose, task } = props;
  const members = useMembers();
  const events = useEvents();
  // The selects need their options before the form sets their values, or the
  // browser falls back to the first option.
  const ready = !members.isPending && !events.isPending;
  return (
    <Dialog open={open} onClose={onClose} title={task ? FORM.editTitle : FORM.addTitle}>
      {ready ? (
        // A reloaded task (new version) starts a fresh form.
        <TaskForm
          key={task ? `${task.id}:${task.version}` : "new"}
          {...props}
          members={members.data ?? []}
          events={events.data ?? []}
        />
      ) : (
        <div aria-busy="true" aria-label="Loading" className="flex animate-pulse flex-col gap-5">
          <div className="h-12 rounded-xl bg-sand" />
          <div className="h-12 rounded-xl bg-sand" />
          <div className="h-12 rounded-xl bg-sand" />
        </div>
      )}
    </Dialog>
  );
}

function TaskForm({
  onClose,
  task,
  initialEventId,
  timeZone,
  onSaved,
  onDeleted,
  members,
  events,
}: Readonly<TaskFormDialogProps & { members: readonly MemberDto[]; events: readonly EventDto[] }>) {
  const create = useCreateTask();
  const update = useUpdateTask();
  const remove = useDeleteTask();
  const refresh = useRefreshTasks();
  const mutation = task ? update : create;
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const form = useForm({
    resolver: zodResolver(taskFormSchema),
    defaultValues: task ? taskToForm(task, timeZone) : emptyTaskForm({ eventId: initialEventId }),
  });
  const { errors, dirtyFields, isDirty } = form.formState;

  const onError = (error: unknown) => {
    if (!(error instanceof ApiError) || error.code !== "VALIDATION_ERROR" || !error.details) return;
    for (const field of TASK_SERVER_FIELDS) {
      const message = error.details[field];
      if (message) form.setError(field, { type: "server", message }, { shouldFocus: true });
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    if (task) {
      update.mutate(
        { taskId: task.id, body: toUpdateTaskBody(values, dirtyFields, timeZone, task.version) },
        { onSuccess: onSaved, onError },
      );
    } else {
      create.mutate(toCreateTaskBody(values, timeZone), { onSuccess: onSaved, onError });
    }
  });

  // A former member or an archived event stays selectable on the task that has it.
  const formerMember =
    task?.assignedMembershipId && !task.assignee ? task.assignedMembershipId : null;
  const archivedEvent = task?.event?.archivedAt ? task.event : null;

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      <SaveProblem error={mutation.error ?? remove.error} onReload={() => void refresh()} />

      <TextField
        label={FIELDS.title.label}
        autoComplete="off"
        placeholder={FIELDS.title.placeholder}
        error={errors.title?.message}
        {...form.register("title")}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label={FIELDS.assignee.label}
          error={errors.assignedMembershipId?.message}
          {...form.register("assignedMembershipId")}
        >
          <option value="">{FORM.unassigned}</option>
          {formerMember && <option value={formerMember}>{TASKS.formerMember}</option>}
          {members.map((member) => (
            <option key={member.membershipId} value={member.membershipId}>
              {member.user.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={FIELDS.event.label}
          error={errors.eventId?.message}
          {...form.register("eventId")}
        >
          <option value="">{FORM.noEvent}</option>
          {archivedEvent && (
            <option value={archivedEvent.id}>{TASKS.archivedEvent(archivedEvent.name)}</option>
          )}
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label={FIELDS.dueDate.label}
          labelAside={<OptionalTag />}
          type="date"
          error={errors.dueDate?.message}
          hint={
            <p className="text-body-sm text-plum">{FORM.dueDateHint(timeZoneLabel(timeZone))}</p>
          }
          {...form.register("dueDate")}
        />
        <SelectField
          label={FIELDS.status.label}
          error={errors.status?.message}
          {...form.register("status")}
        >
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {TASK_STATUS_LABELS[status]}
            </option>
          ))}
        </SelectField>
      </div>

      <fieldset>
        <legend className="mb-2 text-label-md text-graphite">{FIELDS.priority.label}</legend>
        <div className="grid grid-cols-3 gap-2">
          {TASK_PRIORITIES.map((priority) => (
            <label key={priority} className="cursor-pointer">
              <input
                type="radio"
                value={priority}
                className="peer sr-only"
                {...form.register("priority")}
              />
              <span
                className={cn(
                  "flex h-10 items-center justify-center rounded-full border border-sand bg-white text-label-md text-graphite hover:bg-sand",
                  "peer-checked:border-burgundy peer-checked:bg-burgundy peer-checked:text-ivory",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-burgundy",
                )}
              >
                {TASK_PRIORITY_LABELS[priority]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <TextAreaField
        label={FIELDS.description.label}
        labelAside={<OptionalTag />}
        rows={3}
        placeholder={FIELDS.description.placeholder}
        error={errors.description?.message}
        {...form.register("description")}
      />

      {task && onDeleted && (
        <div className="rounded-2xl border border-sand bg-white p-3">
          {confirmingDelete ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-body-md text-graphite">{FORM.confirmDelete.prompt}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className={cn(secondaryButton, "h-9 px-3.5")}
                >
                  {FORM.confirmDelete.cancel}
                </button>
                <button
                  type="button"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(task.id, { onSuccess: () => onDeleted(task) })}
                  className={cn(
                    secondaryButton,
                    "h-9 border-transparent bg-destructive px-3.5 text-white hover:bg-destructive/90",
                  )}
                >
                  {FORM.confirmDelete.confirm}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className={cn(
                "inline-flex items-center gap-2 rounded text-label-md text-destructive underline-offset-4 hover:underline",
                focusRing,
              )}
            >
              <Trash2 aria-hidden className="size-4" />
              {FORM.delete}
            </button>
          )}
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 grid grid-cols-2 gap-2 border-t border-sand bg-ivory px-4 pt-3 md:static md:mx-0 md:flex md:justify-end md:border-0 md:px-0 md:pt-1">
        <button type="button" onClick={onClose} className={secondaryButton}>
          {FORM.cancel}
        </button>
        <button
          type="submit"
          disabled={mutation.isPending || (task !== undefined && !isDirty)}
          aria-busy={mutation.isPending || undefined}
          className={cn(primaryButton, "disabled:opacity-60")}
        >
          {mutation.isPending ? FORM.saving : FORM.save}
        </button>
      </div>
    </form>
  );
}

/** Field problems show on the fields; everything else gets one banner. */
function SaveProblem({ error, onReload }: Readonly<{ error: unknown; onReload: () => void }>) {
  if (!error) return null;
  if (error instanceof ApiError) {
    if (error.code === "VALIDATION_ERROR" && error.details) return null;
    if (error.code === "CONFLICT") {
      return (
        <FormAlert title={FORM.conflict.title}>
          <p>{FORM.conflict.description}</p>
          <button
            type="button"
            onClick={onReload}
            className={cn(
              "mt-2 inline-flex items-center gap-1.5 rounded font-semibold text-burgundy underline-offset-4 hover:underline",
              focusRing,
            )}
          >
            <RefreshCw aria-hidden className="size-4" />
            {FORM.conflict.action}
          </button>
        </FormAlert>
      );
    }
    if (error.code === "NOT_FOUND") {
      return <FormAlert title={FORM.gone.title}>{FORM.gone.description}</FormAlert>;
    }
  }
  return <FormAlert title={FORM.error.title}>{FORM.error.description}</FormAlert>;
}
