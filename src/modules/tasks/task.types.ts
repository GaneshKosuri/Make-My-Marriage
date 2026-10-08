/**
 * Task DTOs and inputs (API_DESIGN §34–38). Isomorphic.
 * TODO(Phase 2): derive inputs from ./task.schemas.ts with z.infer.
 */
import type { PageQuery } from "@/lib/pagination";

import type { MemberRole } from "@/modules/members/member.constants";

import type { TaskPriority, TaskStatus } from "./task.constants";

export interface TaskDto {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  completedAt: string | null;
  /** null when unassigned; the UI shows "Former member" for a removed assignee. */
  assignee: { membershipId: string; name: string; role: MemberRole } | null;
  event: { id: string; name: string; archivedAt: string | null } | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListTasksQuery extends PageQuery {
  status?: TaskStatus;
  priority?: TaskPriority;
  /** An event id or "none". */
  eventId?: string;
  /** A membership id or "none". */
  assignedMembershipId?: string;
  mine?: boolean;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  assignedMembershipId?: string | null;
  eventId?: string | null;
  dueDate?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
}

export type UpdateTaskInput = Partial<CreateTaskInput> & { version: number };
