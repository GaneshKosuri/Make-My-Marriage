/**
 * Task DTOs and inputs (API_DESIGN §34–38). Isomorphic.
 */
import type { z } from "zod";

import type { MemberRole } from "@/modules/members/member.constants";

import type { TaskPriority, TaskStatus } from "./task.constants";
import type { createTaskSchema, listTasksQuerySchema, updateTaskSchema } from "./task.schemas";

export interface TaskDto {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  completedAt: string | null;
  /**
   * Who the task is assigned to, kept when that member leaves (API_DESIGN §35
   * notes). Null when unassigned.
   */
  assignedMembershipId: string | null;
  /** The assignee's name and role; null when unassigned or a former member ("Former member"). */
  assignee: { membershipId: string; name: string; role: MemberRole } | null;
  event: { id: string; name: string; archivedAt: string | null } | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type ListTasksQuery = z.output<typeof listTasksQuerySchema>;
export type CreateTaskInput = z.output<typeof createTaskSchema>;
export type UpdateTaskInput = z.output<typeof updateTaskSchema>;
