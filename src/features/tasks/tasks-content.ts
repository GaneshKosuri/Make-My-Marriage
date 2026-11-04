/**
 * Copy for the Tasks screen (PRD §9.6). Kept in one place so the screen and its
 * tests agree. Styled like the dashboard (decided 2026-11-04).
 */
import type { TaskStatus } from "@/modules/tasks/task.constants";

/** URL parameters /app/tasks understands (dashboard, "+" sheet and event pages link with them). */
export const TASKS_PARAMS = {
  view: "view",
  /** The dashboard's "My tasks" link. */
  mine: "mine",
  /** Opens the add form straight away. */
  add: "new",
  eventId: "eventId",
} as const;

export const TASKS_ROUTES = {
  list: "/app/tasks",
  add: `/app/tasks?${TASKS_PARAMS.add}=1`,
  /** Add a task already linked to an event. */
  addForEvent: (eventId: string) =>
    `/app/tasks?${TASKS_PARAMS.add}=1&${TASKS_PARAMS.eventId}=${eventId}`,
  forEvent: (eventId: string) => `/app/tasks?${TASKS_PARAMS.eventId}=${eventId}`,
} as const;

export const TASK_VIEWS = ["all", "mine", "completed"] as const;
export type TaskView = (typeof TASK_VIEWS)[number];

export const TASKS = {
  eyebrow: "Planning",
  title: "Tasks",
  description: "Everything to get done, who is doing it and by when.",
  add: "Add task",
  views: {
    label: "Show",
    all: "All tasks",
    mine: "My tasks",
    completed: "Completed",
  } satisfies Record<TaskView | "label", string>,
  filters: {
    label: "Filters",
    status: "Status",
    anyStatus: "Any status",
    event: "Event",
    anyEvent: "Any event",
    noEvent: "General (no event)",
    assignee: "Assigned to",
    anyone: "Anyone",
    unassigned: "Unassigned",
    priority: "Priority",
    anyPriority: "Any priority",
    clear: "Clear filters",
  },
  count: (from: number, to: number, total: number) =>
    total === 0 ? "No tasks" : `${from}–${to} of ${total}`,
  previous: "Previous",
  next: "Next",
  due: "Due",
  overdue: "Overdue",
  formerMember: "Former member",
  archivedEvent: (name: string) => `${name} (archived)`,
  markDone: (title: string) => `Mark "${title}" as completed`,
  markNotDone: (title: string) => `Mark "${title}" as to do`,
  edit: (title: string) => `Edit "${title}"`,
  empty: {
    all: {
      title: "No tasks yet",
      description: "Add the things to do, who is doing them and when they are due.",
    },
    mine: {
      title: "Nothing assigned to you",
      description: "Tasks assigned to you will show here.",
    },
    completed: {
      title: "Nothing completed yet",
      description: "Tick a task when it's done and it will show here.",
    },
    filtered: {
      title: "No tasks match these filters",
      description: "Try another filter, or clear them to see every task.",
    },
    action: "Add a task",
  },
  loadError: { title: "We couldn't load your tasks.", retry: "Try again" },
  statusError: "We couldn't update that task. Try again.",
  statusConflict: "Someone else changed that task, so the list was reloaded. Try again.",
  form: {
    addTitle: "Add task",
    editTitle: "Edit task",
    fields: {
      title: { label: "Task", placeholder: "e.g. Book the mehendi artist" },
      description: { label: "Notes", placeholder: "Details, phone numbers, links" },
      assignee: { label: "Assigned to" },
      event: { label: "Event" },
      dueDate: { label: "Due date" },
      priority: { label: "Priority" },
      status: { label: "Status" },
    },
    dueDateHint: (zone: string) => `In ${zone}.`,
    optionsError: "We couldn't load the wedding's members and events for this form.",
    optionsRetry: "Try again",
    unassigned: "Unassigned",
    noEvent: "General (no event)",
    cancel: "Cancel",
    save: "Save task",
    saving: "Saving…",
    delete: "Delete task",
    confirmDelete: {
      prompt: "Delete this task? This can't be undone.",
      confirm: "Yes, delete",
      cancel: "Keep it",
    },
    added: (title: string) => `"${title}" added.`,
    updated: (title: string) => `"${title}" saved.`,
    deleted: (title: string) => `"${title}" deleted.`,
    conflict: {
      title: "Someone else changed this task",
      description: "Reload it to see their changes, then make yours again.",
      action: "Reload task",
    },
    gone: {
      title: "This task no longer exists",
      description: "Someone may have deleted it. Close this form to see the latest.",
    },
    error: {
      title: "We couldn't save the task",
      description: "Check your connection and try again.",
    },
  },
  /** The "Tasks" card on an event's page. */
  forEvent: {
    title: "Tasks for this event",
    add: "Add task",
    all: "All tasks for this event",
    empty: "No tasks linked to this event yet.",
  },
} as const;

/** Where a quick tick moves a task: done, or back to do. */
export function toggledStatus(status: TaskStatus): TaskStatus {
  return status === "COMPLETED" ? "TODO" : "COMPLETED";
}
