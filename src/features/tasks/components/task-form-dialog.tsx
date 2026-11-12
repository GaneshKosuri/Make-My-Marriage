"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { DateField } from "@/components/ui/date-time-fields";
import { SaveProblem } from "@/components/ui/save-problem";

import { OptionalTag, SelectField, TextAreaField, TitleField } from "@/components/ui/form-controls";
import { focusRing, primaryButton, secondaryButton } from "@/components/ui/button-styles";
import { Dialog } from "@/components/ui/dialog";
import { useEvents } from "@/features/events/api";
import { useMembers } from "@/features/members/api";
import { timeZoneLabel } from "@/features/weddings/create-wedding-content";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import type { DateOnly } from "@/lib/dates";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
} from "@/modules/tasks/task.constants";
import type { EventDto } from "@/modules/events/event.types";
import type { MemberDto } from "@/modules/members/member.types";
import type { TaskDto } from "@/modules/tasks/task.types";

import { useCreateTask, useDeleteTask, useReloadTask, useUpdateTask } from "../api";
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

export interface TaskFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** The task being edited; adds a new one when absent. */
  task?: TaskDto;
  /** Pre-selected event for a new task (from an event's page). */
  initialEventId?: string;
  timeZone: string;
  /** Today in the wedding's time zone (the due date's "Today" shortcut). */
  today: DateOnly;
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
  const reloadTask = useReloadTask();
  // A copy fetched by "Reload task" after a CONFLICT; `count` starts a fresh form.
  const [reloaded, setReloaded] = useState<{ task: TaskDto; count: number } | null>(null);
  const current = reloaded && task && reloaded.task.id === task.id ? reloaded.task : task;

  // The selects need their options before the form sets their values, or the
  // browser falls back to the first option.
  let body;
  if (members.isError || events.isError) {
    body = (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="text-body-md text-destructive">{FORM.optionsError}</p>
        <button
          type="button"
          onClick={() => {
            void members.refetch();
            void events.refetch();
          }}
          className={secondaryButton}
        >
          <RefreshCw aria-hidden className="size-4" />
          {FORM.optionsRetry}
        </button>
      </div>
    );
  } else if (members.data && events.data) {
    body = (
      // Keyed by id only: a newer copy arriving in the background must not wipe
      // what is being typed. Saving then answers CONFLICT, and "Reload task"
      // starts a fresh form from the latest copy.
      <TaskForm
        key={current ? `${current.id}:${reloaded?.count ?? 0}` : "new"}
        {...props}
        task={current}
        members={members.data}
        events={events.data}
        onReload={async () => {
          if (!current) return;
          const fresh = await reloadTask(current.id);
          setReloaded((last) => ({ task: fresh, count: (last?.count ?? 0) + 1 }));
        }}
      />
    );
  } else {
    body = (
      <div aria-busy="true" aria-label="Loading" className="flex animate-pulse flex-col gap-5">
        <div className="h-12 rounded-xl bg-sand" />
        <div className="h-12 rounded-xl bg-sand" />
        <div className="h-12 rounded-xl bg-sand" />
      </div>
    );
  }
  return (
    <Dialog open={open} onClose={onClose} title={task ? FORM.editTitle : FORM.addTitle}>
      {body}
    </Dialog>
  );
}

function TaskForm({
  onClose,
  task: taskProp,
  initialEventId,
  timeZone,
  today,
  onSaved,
  onDeleted,
  members,
  events,
  onReload,
}: Readonly<
  TaskFormDialogProps & {
    members: readonly MemberDto[];
    events: readonly EventDto[];
    onReload: () => Promise<void>;
  }
>) {
  // The copy this form was opened with: its values and version are what an edit
  // is based on, even if a newer copy arrives meanwhile.
  const [task] = useState(taskProp);
  const create = useCreateTask();
  const update = useUpdateTask();
  const remove = useDeleteTask();
  const mutation = task ? update : create;
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [reloadFailed, setReloadFailed] = useState(false);

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
      <SaveProblem
        error={reloadFailed ? new ApiError(404, "NOT_FOUND", "") : (mutation.error ?? remove.error)}
        onReload={() => void onReload().catch(() => setReloadFailed(true))}
        copy={FORM}
      />

      <TitleField
        label={FIELDS.title.label}
        autoComplete="off"
        placeholder={FIELDS.title.placeholder}
        error={errors.title?.message}
        {...form.register("title")}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Controller
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <DateField
              label={FIELDS.dueDate.label}
              labelAside={<OptionalTag />}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              fieldRef={field.ref}
              clearable
              today={today}
              error={errors.dueDate?.message}
              hint={
                <p className="text-body-sm text-plum">
                  {FORM.dueDateHint(timeZoneLabel(timeZone))}
                </p>
              }
            />
          )}
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

      {task && onDeleted && !confirmingDelete && (
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className={cn(
            "inline-flex min-h-11 items-center gap-2 self-start rounded text-label-md text-destructive underline-offset-4 hover:underline",
            focusRing,
          )}
        >
          <Trash2 aria-hidden className="size-4" />
          {FORM.delete}
        </button>
      )}

      {/*
        The pinned action bar. While a delete is being confirmed it becomes the
        confirmation, so the prompt is always on screen and there's only one set of
        buttons (QA M8). Like the other confirmations, the destructive button is on top on phones.
      */}
      {task && onDeleted && confirmingDelete ? (
        <div
          role="group"
          aria-label={FORM.confirmDelete.prompt}
          className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-sand bg-ivory px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:static md:mx-0 md:border-0 md:px-0 md:pt-1 md:pb-0"
        >
          <p className="text-body-md text-graphite">{FORM.confirmDelete.prompt}</p>
          <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className={secondaryButton}
            >
              {FORM.confirmDelete.cancel}
            </button>
            <button
              type="button"
              autoFocus
              disabled={remove.isPending}
              onClick={() => remove.mutate(task.id, { onSuccess: () => onDeleted(task) })}
              className={cn(
                secondaryButton,
                "border-transparent bg-destructive text-white hover:bg-destructive/90",
              )}
            >
              {FORM.confirmDelete.confirm}
            </button>
          </div>
        </div>
      ) : (
        <div className="sticky bottom-0 -mx-4 grid grid-cols-2 gap-2 border-t border-sand bg-ivory px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:static md:mx-0 md:flex md:justify-end md:border-0 md:px-0 md:pt-1 md:pb-0">
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
      )}
    </form>
  );
}

/** Field problems show on the fields; everything else gets one banner. */
