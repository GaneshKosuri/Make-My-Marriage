/** Tasks (PRD §9.6; DATABASE_DESIGN §36–40; API_DESIGN §34–38). Isomorphic. */

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "COMPLETED"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const DEFAULT_TASK_PRIORITY: TaskPriority = "MEDIUM";
export const DEFAULT_TASK_STATUS: TaskStatus = "TODO";

export const TASK_TITLE_MAX_LENGTH = 200;
export const TASK_DESCRIPTION_MAX_LENGTH = 2000;

/** `eventId=none` → general tasks; `assignedMembershipId=none` → unassigned (API_DESIGN §34). */
export const TASK_FILTER_NONE = "none";
