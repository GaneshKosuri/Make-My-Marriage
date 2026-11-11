"use client";

import { Check, CheckCircle2, ListChecks, Plus, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useState, type ComponentProps } from "react";

import { focusRing, primaryButton } from "@/features/dashboard/components/dashboard-card";
import { isOverdue } from "@/features/dashboard/format";
import { useEvents } from "@/features/events/api";
import { useMembers } from "@/features/members/api";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import type { DateOnly } from "@/lib/dates";
import {
  TASK_FILTER_NONE,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from "@/modules/tasks/task.constants";
import type { TaskDto } from "@/modules/tasks/task.types";

import { useRefreshTasks, useTasks, useUpdateTask, type TasksQuery } from "../api";
import {
  TASK_VIEWS,
  TASKS,
  TASKS_PARAMS,
  TASKS_ROUTES,
  toggledStatus,
  type TaskView,
} from "../tasks-content";
import { readTasksUrl } from "../url-state";
import { TaskFormDialog } from "./task-form-dialog";
import { OverdueChip, PriorityChip, TaskMeta } from "./task-meta";

const PAGE_SIZE = 20;

const secondaryButton = cn(
  "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-sand bg-white px-4 text-label-md text-graphite hover:bg-sand disabled:opacity-50",
  focusRing,
);

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  /** An event id or "none". */
  eventId?: string;
  /** A membership id or "none". */
  assignedMembershipId?: string;
}

export interface TasksScreenProps {
  timeZone: string;
  /** Today in the wedding's time zone (overdue tasks). */
  today: DateOnly;
}

/** The API query for a view: My tasks are the caller's, Completed is a status. */
function toQuery(view: TaskView, filters: TaskFilters, page: number): TasksQuery {
  const query: TasksQuery = { page, limit: PAGE_SIZE, ...filters };
  if (view === "mine") {
    query.mine = true;
    delete query.assignedMembershipId;
  }
  if (view === "completed") query.status = "COMPLETED";
  return query;
}

/** The address for this view and these filters, so it can be shared or reloaded. */
function urlFor(view: TaskView, filters: TaskFilters): string {
  const params = new URLSearchParams();
  if (view !== "all") params.set(TASKS_PARAMS.view, view);
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const search = params.toString();
  return search ? `${TASKS_ROUTES.list}?${search}` : TASKS_ROUTES.list;
}

/** What the form is showing: a new task (maybe for an event) or an existing one. */
type Editing = { kind: "new"; eventId?: string } | { kind: "edit"; task: TaskDto } | null;

/** The address's view, filters and `?new=1` flag. */
function useTasksUrl() {
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  return { search, ...readTasksUrl(Object.fromEntries(searchParams)) };
}

/**
 * /app/tasks (PRD §9.6, API_DESIGN §34–38): All / My / Completed views,
 * filters by status, event, assignee and priority, a quick tick to complete,
 * and the add/edit form. The view and filters live in the address.
 */
export function TasksScreen({ timeZone, today }: Readonly<TasksScreenProps>) {
  const url = useTasksUrl();
  const [view, setView] = useState<TaskView>(url.view);
  const [filters, setFilters] = useState<TaskFilters>(url.filters);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Editing>(
    url.startAdding ? { kind: "new", eventId: url.filters.eventId } : null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const tasks = useTasks(toQuery(view, filters, page));

  // The screen stays mounted between visits, so links into it (the dashboard's
  // "My tasks", an event's "All tasks for this event", the "+" sheet's ?new=1)
  // arrive as a new address. Follow it unless it is the one this screen just
  // wrote itself (see `show`).
  const [lastSearch, setLastSearch] = useState(url.search);
  if (url.search !== lastSearch) {
    setLastSearch(url.search);
    if (urlFor(url.view, url.filters) !== urlFor(view, filters)) {
      setView(url.view);
      setFilters(url.filters);
      setPage(1);
      setNotice(null);
    }
    if (url.startAdding) setEditing({ kind: "new", eventId: url.filters.eventId });
  }
  // Then drop ?new=1, so a reload or Back doesn't open the form again.
  const { startAdding } = url;
  const cleanUrl = urlFor(url.view, url.filters);
  useEffect(() => {
    if (startAdding) window.history.replaceState(null, "", cleanUrl);
  }, [startAdding, cleanUrl]);

  // A page emptied by a delete or a tick (or shrunk by someone else) moves
  // back to the last page that still has tasks.
  const lastPage = tasks.data?.pagination.totalPages ?? 0;
  if (tasks.data && !tasks.isPlaceholderData && page > Math.max(lastPage, 1)) {
    setPage(Math.max(lastPage, 1));
  }

  const show = (nextView: TaskView, nextFilters: TaskFilters) => {
    setView(nextView);
    setFilters(nextFilters);
    setPage(1);
    setNotice(null);
    window.history.replaceState(null, "", urlFor(nextView, nextFilters));
  };

  // After a refetch the form follows the latest copy of the task it is editing.
  const editingTask =
    editing?.kind === "edit"
      ? (tasks.data?.data.find((task) => task.id === editing.task.id) ?? editing.task)
      : undefined;
  const filtered = Object.values(filters).some(Boolean);

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4 md:gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow text-gold-deep uppercase">{TASKS.eyebrow}</p>
          <h1 className="mt-1 font-serif text-headline-md text-graphite md:text-headline-lg">
            {TASKS.title}
          </h1>
          <p className="mt-1 text-body-md text-plum">{TASKS.description}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setNotice(null);
            setEditing({ kind: "new" });
          }}
          className={primaryButton}
        >
          <Plus aria-hidden className="size-4" />
          {TASKS.add}
        </button>
      </header>

      <div
        role="group"
        aria-label={TASKS.views.label}
        className="grid grid-cols-3 rounded-full bg-sand p-1 sm:inline-grid sm:self-start"
      >
        {TASK_VIEWS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={view === value}
            onClick={() => show(value, filters)}
            className={cn(
              "h-10 rounded-full px-4 text-label-md transition-colors",
              focusRing,
              view === value ? "bg-white text-graphite shadow-sm" : "text-plum hover:text-graphite",
            )}
          >
            {TASKS.views[value]}
          </button>
        ))}
      </div>

      <FilterBar view={view} filters={filters} onChange={(next) => show(view, next)} />

      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-sand bg-white p-4 text-body-md text-graphite"
        >
          <CheckCircle2 aria-hidden className="size-5 shrink-0 text-gold-deep" />
          {notice}
        </p>
      )}

      {tasks.data ? (
        <TaskList
          tasks={tasks.data.data}
          pagination={tasks.data.pagination}
          view={view}
          filtered={filtered}
          timeZone={timeZone}
          today={today}
          onPage={setPage}
          onEdit={(task) => {
            setNotice(null);
            setEditing({ kind: "edit", task });
          }}
          onAdd={() => setEditing({ kind: "new" })}
          onClearFilters={() => show(view, {})}
          onNotice={setNotice}
        />
      ) : tasks.isError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-destructive/20 bg-white p-5"
        >
          <p className="text-body-md text-destructive">{TASKS.loadError.title}</p>
          <button type="button" onClick={() => void tasks.refetch()} className={secondaryButton}>
            <RefreshCw aria-hidden className={cn("size-4", tasks.isFetching && "animate-spin")} />
            {TASKS.loadError.retry}
          </button>
        </div>
      ) : (
        <ListSkeleton />
      )}

      <TaskFormDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        task={editingTask}
        initialEventId={editing?.kind === "new" ? editing.eventId : undefined}
        timeZone={timeZone}
        today={today}
        onSaved={(task) => {
          setNotice(
            editing?.kind === "edit"
              ? TASKS.form.updated(task.title)
              : TASKS.form.added(task.title),
          );
          setEditing(null);
        }}
        onDeleted={(task) => {
          setNotice(TASKS.form.deleted(task.title));
          setEditing(null);
        }}
      />
    </div>
  );
}

function FilterBar({
  view,
  filters,
  onChange,
}: Readonly<{ view: TaskView; filters: TaskFilters; onChange: (filters: TaskFilters) => void }>) {
  const members = useMembers();
  const events = useEvents(true);
  const copy = TASKS.filters;
  const set = (key: keyof TaskFilters, value: string) =>
    onChange({ ...filters, [key]: value || undefined });

  return (
    <fieldset className="flex flex-col gap-3 rounded-3xl border border-sand bg-white p-4 md:p-5">
      <legend className="sr-only">{copy.label}</legend>
      {/* One column on the narrowest phones, where 16 px "Any priority" no longer fits half the card. */}
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 md:grid-cols-4">
        {view !== "completed" && (
          <FilterSelect
            label={copy.status}
            value={filters.status ?? ""}
            onChange={(event) => set("status", event.target.value)}
          >
            <option value="">{copy.anyStatus}</option>
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {TASK_STATUS_LABELS[status]}
              </option>
            ))}
          </FilterSelect>
        )}
        <FilterSelect
          label={copy.event}
          value={filters.eventId ?? ""}
          onChange={(event) => set("eventId", event.target.value)}
        >
          <option value="">{copy.anyEvent}</option>
          <option value={TASK_FILTER_NONE}>{copy.noEvent}</option>
          {events.data?.map((event) => (
            <option key={event.id} value={event.id}>
              {event.archivedAt ? TASKS.archivedEvent(event.name) : event.name}
            </option>
          ))}
        </FilterSelect>
        {view !== "mine" && (
          <FilterSelect
            label={copy.assignee}
            value={filters.assignedMembershipId ?? ""}
            onChange={(event) => set("assignedMembershipId", event.target.value)}
          >
            <option value="">{copy.anyone}</option>
            <option value={TASK_FILTER_NONE}>{copy.unassigned}</option>
            {members.data?.map((member) => (
              <option key={member.membershipId} value={member.membershipId}>
                {member.user.name}
              </option>
            ))}
          </FilterSelect>
        )}
        <FilterSelect
          label={copy.priority}
          value={filters.priority ?? ""}
          onChange={(event) => set("priority", event.target.value)}
        >
          <option value="">{copy.anyPriority}</option>
          {TASK_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {TASK_PRIORITY_LABELS[priority]}
            </option>
          ))}
        </FilterSelect>
      </div>
      {Object.values(filters).some(Boolean) && (
        <button
          type="button"
          onClick={() => onChange({})}
          className={cn(
            "self-start rounded text-label-md text-burgundy underline-offset-4 hover:underline",
            focusRing,
          )}
        >
          {copy.clear}
        </button>
      )}
    </fieldset>
  );
}

function FilterSelect({
  label,
  children,
  ...select
}: Readonly<{ label: string } & ComponentProps<"select">>) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      {/* Linked by id, not wrapped, so the name is just the label ("Status"). */}
      <label htmlFor={id} className="text-label-sm text-plum">
        {label}
      </label>
      <select
        id={id}
        className={cn(
          // 16 px on phones: iOS Safari zooms in on focus below that (QA M13).
          "h-11 w-full min-w-0 rounded-xl border border-sand bg-ivory px-2.5 text-[16px] text-graphite sm:text-body-md",
          "focus-visible:border-burgundy focus-visible:ring-[3px] focus-visible:ring-burgundy/10 focus-visible:outline-none",
        )}
        {...select}
      >
        {children}
      </select>
    </div>
  );
}

function TaskList({
  tasks,
  pagination,
  view,
  filtered,
  timeZone,
  today,
  onPage,
  onEdit,
  onAdd,
  onClearFilters,
  onNotice,
}: Readonly<{
  tasks: readonly TaskDto[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  view: TaskView;
  filtered: boolean;
  timeZone: string;
  today: DateOnly;
  onPage: (page: number) => void;
  onEdit: (task: TaskDto) => void;
  onAdd: () => void;
  onClearFilters: () => void;
  onNotice: (message: string | null) => void;
}>) {
  if (pagination.total === 0) {
    const empty = filtered ? TASKS.empty.filtered : TASKS.empty[view];
    return (
      <div className="rounded-3xl border border-dashed border-sand bg-white px-5 py-10 text-center">
        <ListChecks aria-hidden className="mx-auto size-8 text-gold-deep" />
        <p className="mt-3 font-serif text-title-lg text-graphite">{empty.title}</p>
        <p className="mx-auto mt-1 max-w-sm text-body-md text-plum">{empty.description}</p>
        {filtered ? (
          <button type="button" onClick={onClearFilters} className={cn(secondaryButton, "mt-5")}>
            {TASKS.filters.clear}
          </button>
        ) : (
          view !== "completed" && (
            <button type="button" onClick={onAdd} className={cn(primaryButton, "mt-5")}>
              {TASKS.empty.action}
            </button>
          )
        )}
      </div>
    );
  }

  // A page past the end (its last task just went): the screen is moving back a page.
  if (tasks.length === 0) return <ListSkeleton />;

  const from = (pagination.page - 1) * pagination.limit + 1;
  const to = from + tasks.length - 1;
  return (
    <section
      aria-label={TASKS.views[view]}
      className="rounded-3xl border border-sand bg-white p-5 shadow-sm md:p-7"
    >
      <ul className="divide-y divide-sand">
        {tasks.map((task) => (
          <li key={task.id}>
            <TaskItem
              task={task}
              timeZone={timeZone}
              today={today}
              onEdit={onEdit}
              onNotice={onNotice}
            />
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-sand pt-4">
        <p className="text-body-sm text-plum">{TASKS.count(from, to, pagination.total)}</p>
        {pagination.totalPages > 1 && (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => onPage(pagination.page - 1)}
              className={secondaryButton}
            >
              {TASKS.previous}
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPage(pagination.page + 1)}
              className={secondaryButton}
            >
              {TASKS.next}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/** One task: a tick to complete (or reopen) it, the title to open the form, and its details. */
export function TaskItem({
  task,
  timeZone,
  today,
  onEdit,
  onNotice,
  showEvent = true,
}: Readonly<{
  task: TaskDto;
  timeZone: string;
  today: DateOnly;
  onEdit: (task: TaskDto) => void;
  onNotice: (message: string | null) => void;
  showEvent?: boolean;
}>) {
  const update = useUpdateTask();
  const refresh = useRefreshTasks();
  const done = task.status === "COMPLETED";
  const overdue = isOverdue(task, today, timeZone);

  const toggle = () => {
    onNotice(null);
    update.mutate(
      { taskId: task.id, body: { status: toggledStatus(task.status), version: task.version } },
      {
        onError: (error) => {
          const conflict = error instanceof ApiError && error.code === "CONFLICT";
          onNotice(conflict ? TASKS.statusConflict : TASKS.statusError);
          if (conflict) void refresh();
        },
      },
    );
  };

  return (
    <div className="flex items-start gap-3 py-4">
      <button
        type="button"
        onClick={toggle}
        disabled={update.isPending}
        aria-label={done ? TASKS.markNotDone(task.title) : TASKS.markDone(task.title)}
        aria-pressed={done}
        className={cn(
          "tap-target mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:opacity-50",
          focusRing,
          done
            ? "border-burgundy bg-burgundy text-ivory"
            : task.status === "IN_PROGRESS"
              ? "border-gold-deep text-transparent hover:text-gold-deep"
              : "border-plum/40 text-transparent hover:text-plum",
        )}
      >
        <Check aria-hidden className="size-3.5" strokeWidth={3} />
      </button>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onEdit(task)}
          aria-label={TASKS.edit(task.title)}
          className={cn(
            "tap-target block w-full min-w-0 rounded text-left text-label-md wrap-anywhere text-graphite hover:text-burgundy",
            focusRing,
            done && "text-plum line-through",
          )}
        >
          {task.title}
        </button>
        <TaskMeta
          task={task}
          timeZone={timeZone}
          today={today}
          showStatus={!done}
          showEvent={showEvent}
        />
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {overdue && <OverdueChip />}
        <PriorityChip priority={task.priority} />
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className="animate-pulse rounded-3xl border border-sand bg-white p-5 md:p-7"
    >
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="flex gap-3 py-4">
          <div className="size-6 rounded-full bg-sand" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-56 rounded bg-sand" />
            <div className="h-3 w-40 rounded bg-sand" />
          </div>
        </div>
      ))}
    </div>
  );
}
